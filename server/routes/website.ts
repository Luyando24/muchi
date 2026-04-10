import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireSchoolRole } from "./school.js";

const router = Router();

// --- PUBLIC WEBSITE ENDPOINTS ---

// GET /api/school/public-website-content
router.get(
  "/public-website-content",
  async (req: Request, res: Response) => {
    const { schoolSlug } = req.query;

    if (!schoolSlug) {
      return res.status(400).json({ message: "schoolSlug is required" });
    }

    try {
      // First get school ID from slug
      const { data: school, error: schoolError } = await supabaseAdmin
        .from("schools")
        .select("id")
        .eq("slug", schoolSlug)
        .single();

      if (schoolError || !school) {
        return res.status(404).json({ message: "School not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("website_content")
        .select("*")
        .eq("school_id", school.id)
        .maybeSingle();

      if (error) throw error;
      res.json(data || {});
    } catch (error: any) {
      console.error("Get Public Website Content Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/school/public-blog-posts
router.get(
  "/public-blog-posts",
  async (req: Request, res: Response) => {
    const { schoolSlug } = req.query;

    if (!schoolSlug) {
      return res.status(400).json({ message: "schoolSlug is required" });
    }

    try {
      // First get school ID from slug
      const { data: school, error: schoolError } = await supabaseAdmin
        .from("schools")
        .select("id")
        .eq("slug", schoolSlug)
        .single();

      if (schoolError || !school) {
        return res.status(404).json({ message: "School not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .select("*, profiles(full_name)")
        .eq("school_id", school.id)
        .eq("status", "Published")
        .order("published_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Get Public Blog Posts Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// --- WEBSITE CONTENT ENDPOINTS ---

// GET /api/school/website-content
router.get(
  "/website-content",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data, error } = await supabaseAdmin
        .from("website_content")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle();

      if (error) throw error;
      res.json(data || {});
    } catch (error: any) {
      console.error("Get Website Content Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/school/website-content
router.put(
  "/website-content",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { 
      hero_title, hero_subtitle, hero_image_url, 
      about_text, contact_email, contact_phone, 
      address, facebook_url, twitter_url, 
      instagram_url, linkedin_url,
      admissions_open, admissions_title,
      admissions_text, apply_button_text,
      admission_form_fields, admission_required_documents
    } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("website_content")
        .upsert({
          school_id: schoolId,
          hero_title,
          hero_subtitle,
          hero_image_url,
          about_text,
          contact_email,
          contact_phone,
          address,
          facebook_url,
          twitter_url,
          instagram_url,
          linkedin_url,
          admissions_open,
          admissions_title,
          admissions_text,
          apply_button_text,
          admission_form_fields,
          admission_required_documents,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Website Content Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// --- BLOG POSTS ENDPOINTS ---

// GET /api/school/blog-posts
router.get(
  "/blog-posts",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .select("*, profiles(full_name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Get Blog Posts Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/school/blog-posts
router.post(
  "/blog-posts",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { title, content, excerpt, cover_image_url, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and Content are required" });
    }

    try {
      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .insert({
          school_id: schoolId,
          author_id: profile.id,
          title,
          slug,
          content,
          excerpt,
          cover_image_url,
          status: status || "Draft",
          published_at: status === "Published" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Blog Post Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/school/blog-posts/:id
router.put(
  "/blog-posts/:id",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { title, content, excerpt, cover_image_url, status } = req.body;

    try {
      const updateData: any = {
        title,
        content,
        excerpt,
        cover_image_url,
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "Published") {
        updateData.published_at = new Date().toISOString();
      }

      if (title) {
        updateData.slug = title
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");
      }

      const { data, error } = await supabaseAdmin
        .from("blog_posts")
        .update(updateData)
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Blog Post Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// DELETE /api/school/blog-posts/:id
router.delete(
  "/blog-posts/:id",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("blog_posts")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Blog post deleted successfully" });
    } catch (error: any) {
      console.error("Delete Blog Post Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// --- TENDER ENDPOINTS ---

// GET /api/school/public-tenders
router.get(
  "/public-tenders",
  async (req: Request, res: Response) => {
    const { schoolSlug } = req.query;

    if (!schoolSlug) {
      return res.status(400).json({ message: "schoolSlug is required" });
    }

    try {
      const { data: school, error: schoolError } = await supabaseAdmin
        .from("schools")
        .select("id")
        .eq("slug", schoolSlug)
        .single();

      if (schoolError || !school) {
        return res.status(404).json({ message: "School not found" });
      }

      const { data, error } = await supabaseAdmin
        .from("school_tenders")
        .select("*")
        .eq("school_id", school.id)
        .eq("status", "Open")
        .order("deadline", { ascending: true });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Get Public Tenders Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/school/tenders
router.get(
  "/tenders",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;

    try {
      const { data, error } = await supabaseAdmin
        .from("school_tenders")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Get Tenders Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/school/tenders
router.post(
  "/tenders",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { title, description, category, deadline, contact_info, document_url, status } = req.body;

    if (!title || !description || !category || !deadline) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("school_tenders")
        .insert({
          school_id: schoolId,
          created_by: profile.id,
          title,
          description,
          category,
          deadline,
          contact_info,
          document_url,
          status: status || "Open"
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error: any) {
      console.error("Create Tender Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/school/tenders/:id
router.put(
  "/tenders/:id",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;
    const { title, description, category, deadline, contact_info, document_url, status } = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("school_tenders")
        .update({
          title,
          description,
          category,
          deadline,
          contact_info,
          document_url,
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("school_id", schoolId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Update Tender Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// DELETE /api/school/tenders/:id
router.delete(
  "/tenders/:id",
  requireSchoolRole(["school_admin", "content_manager"]),
  async (req: Request, res: Response) => {
    const profile = (req as any).profile;
    const schoolId = profile.school_id;
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
        .from("school_tenders")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;
      res.json({ message: "Tender deleted successfully" });
    } catch (error: any) {
      console.error("Delete Tender Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/school/public-verify-results
router.get(
  "/public-verify-results",
  async (req: Request, res: Response) => {
    const { studentNumber, term, academicYear, examType } = req.query;

    if (!studentNumber || !term || !academicYear) {
      return res.status(400).json({ message: "Student Number, term, and academic year are required" });
    }

    try {
      // 1. Find profile by student number
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("student_number", studentNumber)
        .eq("role", "student")
        .limit(1);

      if (profileError || !profiles || profiles.length === 0) {
        return res.status(404).json({ message: "Student not found or invalid student number." });
      }

      const profile = profiles[0];
      const studentId = profile.id;
      const schoolId = profile.school_id;

      // 2. Fetch school details
      const { data: school, error: schoolError } = await supabaseAdmin
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();

      // 3. Fetch grading scale
      const { data: gradingScale } = await supabaseAdmin
        .from("grading_scales")
        .select("*")
        .eq("school_id", schoolId)
        .order("min_percentage", { ascending: false });

      // 4. Fetch grades for the student, term, and academic year (only Published)
      // We filter by exam_type if it is provided and the column exists. Otherwise, standard matching.
      let query = supabaseAdmin
        .from("student_grades")
        .select(`
          *,
          subjects(name, code, department)
        `)
        .eq("student_id", studentId)
        .eq("academic_year", academicYear)
        .eq("term", term);
        
      if (examType) {
        // Attempt to match examType on the record if applicable
        query = query.eq("exam_type", examType);
      }

      const { data: rawGrades, error: gradesError } = await query;

      if (gradesError) throw gradesError;

      // Deduplicate grades as done in student portal
      const gradesMap = new Map<string, any>();
      if (rawGrades && rawGrades.length > 0) {
        const sortedGrades = [...rawGrades].sort((a, b) => {
          const timeA = new Date(a.calculated_at || a.created_at).getTime();
          const timeB = new Date(b.calculated_at || b.created_at).getTime();
          return timeB - timeA;
        });

        for (const grade of sortedGrades) {
          const subjectCode = grade.subjects?.code || grade.subject_id;
          if (!gradesMap.has(subjectCode)) {
            gradesMap.set(subjectCode, grade);
          }
        }
      }
      
      const grades = Array.from(gradesMap.values());
      const termResults = [];
      if (grades.length > 0) {
        const total = grades.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0);
        const avg = grades.length > 0 ? (total / grades.length).toFixed(1) : 0;
        
        termResults.push({
           term: term,
           academicYear: academicYear,
           average: avg,
           grades: grades
        });
      }

      // 5. Build Class name (using enrollments)
      const { data: enrollment } = await supabaseAdmin
        .from("enrollments")
        .select("*, classes(id, name)")
        .eq("student_id", studentId)
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const classId = (enrollment?.classes as any)?.id || null;

      // 6. Compute class rankings (same logic as getClassRankings in school.ts)
      let position = 0;
      let totalStudents = 0;
      let classAverage = 0;

      if (classId) {
        const { data: classEnrollments } = await supabaseAdmin
          .from("enrollments")
          .select("student_id")
          .eq("class_id", classId)
          .eq("academic_year", academicYear as string);

        if (classEnrollments && classEnrollments.length > 0) {
          const classStudentIds = classEnrollments.map((e: any) => e.student_id);
          totalStudents = classStudentIds.length;

          let gradesQuery = supabaseAdmin
            .from("student_grades")
            .select("student_id, percentage")
            .in("student_id", classStudentIds)
            .eq("term", term as string)
            .eq("academic_year", academicYear as string);

          if (examType) {
            gradesQuery = gradesQuery.eq("exam_type", examType as string);
          }

          const { data: classGrades } = await gradesQuery;

          // Compute per-student average
          const studentAverages: Record<string, { total: number; count: number }> = {};
          classStudentIds.forEach((id: string) => {
            studentAverages[id] = { total: 0, count: 0 };
          });

          if (classGrades) {
            classGrades.forEach((g: any) => {
              if (g.percentage !== null && g.percentage !== undefined && g.percentage !== "") {
                studentAverages[g.student_id].total += Number(g.percentage);
                studentAverages[g.student_id].count += 1;
              }
            });
          }

          let classTotal = 0;
          let classCount = 0;

          const averagesList = Object.entries(studentAverages).map(([id, data]) => {
            const avg = data.count > 0 ? data.total / data.count : 0;
            if (data.count > 0) {
              classTotal += avg;
              classCount += 1;
            }
            return { id, avg };
          });

          averagesList.sort((a, b) => b.avg - a.avg);
          averagesList.forEach((item, index) => {
            if (item.id === studentId) position = index + 1;
          });

          classAverage = classCount > 0 ? classTotal / classCount : 0;
        }
      }

      const normalizedStudent = {
        id: profile.id,
        firstName: profile.first_name || profile.firstName || profile.full_name?.split(' ')[0],
        lastName: profile.last_name || profile.lastName || profile.full_name?.split(' ').slice(1).join(' '),
        name: profile.full_name,
        studentNumber: profile.student_number || 'N/A',
        class: (enrollment?.classes as any)?.name || 'Unassigned',
        avatarUrl: profile.avatar_url || profile.avatarUrl,
        position,
        totalStudents,
        classAverage,
      };

      const response = {
        student: normalizedStudent,
        school: school,
        gradingScale: gradingScale || [],
        termResults: termResults,
        assignedSubjects: [] 
      };

      res.json(response);
    } catch (error: any) {
      console.error("Public Verify Results Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export const websiteRouter = router;
