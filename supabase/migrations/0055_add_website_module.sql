-- Migration: Add School Website Module
-- Description: Adds tables for managing school website content and blog system.

-- 1. Website Content Table
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id)
);

-- 2. Blog Posts Table
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

-- 3. Enable RLS
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for website_content
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

CREATE POLICY "Public can view website content"
ON public.website_content
FOR SELECT
TO public
USING (true);

-- 5. RLS Policies for blog_posts
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

CREATE POLICY "Public can view published blog posts"
ON public.blog_posts
FOR SELECT
TO public
USING (status = 'Published');

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_website_content_updated_at
    BEFORE UPDATE ON public.website_content
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
