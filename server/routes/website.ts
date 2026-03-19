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

export const websiteRouter = router;
