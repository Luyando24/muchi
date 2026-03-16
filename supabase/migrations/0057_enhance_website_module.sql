-- Migration: Enhance Website Module (Combined)
-- Description: Creates website tables if missing and adds customization fields.

-- 1. Website Content Table (from 0055 + 0057 enhancements)
CREATE TABLE IF NOT EXISTS public.website_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    hero_title TEXT,
    hero_subtitle TEXT,
    hero_image_url TEXT,
    about_text TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    facebook_url TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    linkedin_url TEXT,
    admissions_open BOOLEAN DEFAULT true,
    admissions_title TEXT DEFAULT 'Online Admission',
    admissions_text TEXT DEFAULT 'Apply for the upcoming academic year.',
    apply_button_text TEXT DEFAULT 'Apply Now',
    admission_form_fields JSONB DEFAULT '[]',
    admission_required_documents JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id)
);

-- 2. Blog Posts Table (from 0055)
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Published'
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, slug)
);

-- 3. Enhance student_applications (from 0057)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_applications' AND column_name = 'dynamic_fields') THEN
        ALTER TABLE public.student_applications ADD COLUMN dynamic_fields JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_applications' AND column_name = 'documents') THEN
        ALTER TABLE public.student_applications ADD COLUMN documents JSONB DEFAULT '{}';
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for website_content
DROP POLICY IF EXISTS "School admins can manage their website content" ON public.website_content;
CREATE POLICY "School admins can manage their website content"
ON public.website_content
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.school_id = website_content.school_id
        AND profiles.role = 'school_admin'
    )
);

DROP POLICY IF EXISTS "Public can view website content" ON public.website_content;
CREATE POLICY "Public can view website content"
ON public.website_content
FOR SELECT
TO public
USING (true);

-- 6. RLS Policies for blog_posts
DROP POLICY IF EXISTS "School admins can manage their blog posts" ON public.blog_posts;
CREATE POLICY "School admins can manage their blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.school_id = blog_posts.school_id
        AND profiles.role = 'school_admin'
    )
);

DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
CREATE POLICY "Public can view published blog posts"
ON public.blog_posts
FOR SELECT
TO public
USING (status = 'Published');

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_website_content_updated_at ON public.website_content;
CREATE TRIGGER update_website_content_updated_at
    BEFORE UPDATE ON public.website_content
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
