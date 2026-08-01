import { createHmac, randomBytes } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const REPORTER_TYPES = ['Parent', 'Pupil', 'Community'] as const;
const ISSUE_CATEGORIES = [
  'No meal served',
  'Late meal',
  'Small portion',
  'Poor quality',
  'Food safety or hygiene',
  'Missing programme days',
  'Other'
] as const;

const ratingSchema = z.number().int().min(1).max(5).nullable().optional();

const feedbackSchema = z.object({
  schoolId: z.string().uuid(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reporterType: z.enum(REPORTER_TYPES),
  mealServed: z.boolean(),
  overallRating: ratingSchema,
  portionRating: ratingSchema,
  qualityRating: ratingSchema,
  issueCategories: z.array(z.enum(ISSUE_CATEGORIES)).max(7).default([]),
  comments: z.string().trim().max(1000).optional().default(''),
  website: z.string().max(200).optional().default('')
}).superRefine((value, context) => {
  if (value.mealServed && value.overallRating == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['overallRating'],
      message: 'Please provide an overall meal rating.'
    });
  }

  if (!value.mealServed && [value.overallRating, value.portionRating, value.qualityRating].some(rating => rating != null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['overallRating'],
      message: 'Ratings cannot be provided when no meal was served.'
    });
  }
});

const getZambiaDate = (date = new Date()) => {
  const zambiaTime = new Date(date.getTime() + (2 * 60 * 60 * 1000));
  return zambiaTime.toISOString().slice(0, 10);
};

const getRequesterAddress = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedAddress = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return forwardedAddress?.trim() || req.ip || req.socket.remoteAddress || 'unknown';
};

const createFingerprint = (req: Request) => {
  const secret = process.env.FEEDING_FEEDBACK_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;

  const source = [
    getRequesterAddress(req),
    req.get('user-agent') || 'unknown',
    req.get('accept-language') || 'unknown'
  ].join('|');

  return createHmac('sha256', secret).update(source).digest('hex');
};

const createReferenceCode = () => `MEAL-${randomBytes(8).toString('hex').toUpperCase()}`;

const containsContactDetails = (value: string) => {
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phonePattern = /(?:\+?\d[\s().-]*){8,}/;
  return emailPattern.test(value) || phonePattern.test(value);
};

const publicReadLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many requests. Please wait a few minutes and try again.'
});

const publicSubmissionLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Too many reports have been submitted from this connection. Please try again later.'
});

router.get('/schools', publicReadLimiter, async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
    let query = supabaseAdmin
      .from('schools')
      .select('id, name, province, district, school_type')
      .order('name', { ascending: true })
      .limit(250);

    if (search.length >= 2) query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (error: any) {
    console.error('Public feeding feedback school lookup failed:', error);
    res.status(500).json({ message: 'Unable to load schools right now.' });
  }
});

router.post('/', publicSubmissionLimiter, async (req: Request, res: Response) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || 'Please check the report details.'
    });
  }

  const input = parsed.data;

  // Honeypot: return a plausible response without storing automated submissions.
  if (input.website) {
    return res.status(201).json({ referenceCode: createReferenceCode(), status: 'New' });
  }

  const today = getZambiaDate();
  const earliestDate = new Date(`${today}T00:00:00.000Z`);
  earliestDate.setUTCDate(earliestDate.getUTCDate() - 6);
  const earliestAllowed = earliestDate.toISOString().slice(0, 10);

  if (input.serviceDate < earliestAllowed || input.serviceDate > today) {
    return res.status(400).json({ message: 'The meal date must be within the last seven days.' });
  }

  if (input.comments && containsContactDetails(input.comments)) {
    return res.status(400).json({
      message: 'For your privacy, remove phone numbers and email addresses from the comment.'
    });
  }

  const fingerprint = createFingerprint(req);
  if (!fingerprint) {
    console.error('FEEDING_FEEDBACK_SALT or SUPABASE_SERVICE_ROLE_KEY is required for anonymous abuse protection.');
    return res.status(503).json({ message: 'Anonymous reporting is temporarily unavailable.' });
  }

  try {
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('id', input.schoolId)
      .single();

    if (schoolError || !school) {
      return res.status(400).json({ message: 'Please select a valid school.' });
    }

    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000)).toISOString();
    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from('feeding_program_feedback')
      .select('id')
      .eq('submission_fingerprint', fingerprint)
      .eq('school_id', input.schoolId)
      .eq('service_date', input.serviceDate)
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (duplicateError) throw duplicateError;
    if (duplicate?.length) {
      return res.status(429).json({
        message: 'A report for this school and meal date was recently received from this connection.'
      });
    }

    const issues = new Set(input.issueCategories);
    if (!input.mealServed) issues.add('No meal served');

    let priority: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (issues.has('Food safety or hygiene')) priority = 'Critical';
    else if (!input.mealServed || (input.overallRating != null && input.overallRating <= 2)) priority = 'High';
    else if (issues.size > 0 || input.overallRating === 3) priority = 'Medium';

    const referenceCode = createReferenceCode();
    const { error: insertError } = await supabaseAdmin
      .from('feeding_program_feedback')
      .insert({
        reference_code: referenceCode,
        school_id: input.schoolId,
        service_date: input.serviceDate,
        reporter_type: input.reporterType,
        meal_served: input.mealServed,
        overall_rating: input.mealServed ? input.overallRating : null,
        portion_rating: input.mealServed ? input.portionRating : null,
        quality_rating: input.mealServed ? input.qualityRating : null,
        issue_categories: [...issues],
        comments: input.comments || null,
        priority,
        submission_fingerprint: fingerprint
      });

    if (insertError) throw insertError;

    return res.status(201).json({ referenceCode, status: 'New' });
  } catch (error: any) {
    console.error('Anonymous feeding feedback submission failed:', error);
    return res.status(500).json({ message: 'Your report could not be submitted. Please try again.' });
  }
});

router.get('/status/:referenceCode', publicReadLimiter, async (req: Request, res: Response) => {
  const referenceCode = req.params.referenceCode.trim().toUpperCase();
  if (!/^MEAL-[A-F0-9]{16}$/.test(referenceCode)) {
    return res.status(400).json({ message: 'Invalid report reference.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_feedback')
      .select('reference_code, status, created_at, reviewed_at')
      .eq('reference_code', referenceCode)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Report reference not found.' });

    return res.json({
      referenceCode: data.reference_code,
      status: data.status,
      submittedAt: data.created_at,
      reviewedAt: data.reviewed_at
    });
  } catch (error: any) {
    console.error('Anonymous feeding feedback status lookup failed:', error);
    return res.status(500).json({ message: 'Unable to check the report right now.' });
  }
});

export const feedingFeedbackRouter = router;
