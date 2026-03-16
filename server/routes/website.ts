import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireSchoolRole } from "./school.js";

const router = Router();

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
    const content = req.body;

    try {
      const { data, error } = await supabaseAdmin
        .from("website_content")
        .upsert({
          ...content,
          school_id: schoolId,
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
