import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export const requireActiveLicense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let user = (req as any).user;
    let profile = (req as any).profile;

    // If user/profile not already attached, fetch them
    if (!user || !profile) {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
      }

      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !userData.user) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }
      user = userData.user;

      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        return res.status(403).json({ message: 'Forbidden: Profile not found' });
      }
      profile = profileData;
      
      // Attach for downstream
      (req as any).user = user;
      (req as any).profile = profile;
    }

    // System Admins always have access
    if (profile.role === 'system_admin') {
      return next();
    }

    const schoolId = profile.school_id || (req as any).schoolId;

    if (!schoolId) {
      return res.status(403).json({ message: 'Forbidden: No school associated with user' });
    }

    // Check License
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('school_licenses')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .single();

    if (licenseError || !license) {
      return res.status(403).json({ 
        message: 'License Expired or Inactive. Please contact your school administrator.',
        code: 'LICENSE_EXPIRED'
      });
    }

    (req as any).license = license;
    next();
  } catch (error: any) {
    console.error('License Check Error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
