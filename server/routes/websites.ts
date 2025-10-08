import { RequestHandler } from 'express';
import { query } from '../lib/db';
import {
  HospitalWebsite,
  WebsiteTheme,
  WebsitePage,
  WebsiteComponent,
  WebsiteMedia,
  CreateWebsiteRequest,
  UpdateWebsiteRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateComponentRequest,
  UpdateComponentRequest
} from '../../shared/api';
import { v4 as uuidv4 } from 'uuid';

// Helper function to generate subdomain from hospital name
function generateSubdomain(hospitalName: string): string {
  return hospitalName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

// Website Management
export const handleCreateWebsite: RequestHandler = async (req, res) => {
  try {
    const { title, description, subdomain, themeId, contactEmail, contactPhone }: CreateWebsiteRequest = req.body;
    const hospitalId = req.session?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({ error: 'Hospital authentication required' });
    }

    // Check if hospital already has a website
    const existingWebsite = await query(
      'SELECT id FROM hospital_websites WHERE hospital_id = ?',
      [hospitalId]
    );

    if (existingWebsite.rows.length > 0) {
      return res.status(400).json({ error: 'Hospital already has a website' });
    }

    // Check if subdomain is available
    const subdomainCheck = await query(
      'SELECT id FROM hospital_websites WHERE subdomain = ?',
      [subdomain]
    );

    if (subdomainCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Subdomain already taken' });
    }

    const websiteId = uuidv4();
    await query(
      `INSERT INTO hospital_websites 
       (id, hospital_id, subdomain, title, description, theme_id, contact_email, contact_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [websiteId, hospitalId, subdomain, title, description, themeId, contactEmail, contactPhone]
    );

    // Get the inserted website
    const result = await query(
      'SELECT * FROM hospital_websites WHERE id = ?',
      [websiteId]
    );

    // Create default pages
    const defaultPages = [
      { slug: 'home', title: 'Home', content: { sections: [] }, sortOrder: 0 },
      { slug: 'about', title: 'About Us', content: { sections: [] }, sortOrder: 1 },
      { slug: 'services', title: 'Our Services', content: { sections: [] }, sortOrder: 2 },
      { slug: 'contact', title: 'Contact Us', content: { sections: [] }, sortOrder: 3 }
    ];

    for (const page of defaultPages) {
      await query(
        `INSERT INTO website_pages (id, website_id, slug, title, content, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), websiteId, page.slug, page.title, JSON.stringify(page.content), page.sortOrder]
      );
    }

    const website = result.rows[0];
    res.json({
      id: website.id,
      hospitalId: website.hospital_id,
      subdomain: website.subdomain,
      title: website.title,
      description: website.description,
      themeId: website.theme_id,
      isPublished: website.is_published,
      contactEmail: website.contact_email,
      contactPhone: website.contact_phone,
      createdAt: website.created_at,
      updatedAt: website.updated_at
    } as HospitalWebsite);
  } catch (error) {
    console.error('Create website error:', error);
    res.status(500).json({ error: 'Failed to create website' });
  }
};

export const handleGetWebsite: RequestHandler = async (req, res) => {
  try {
    const hospitalId = req.session?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({ error: 'Hospital authentication required' });
    }

    const result = await query(
      'SELECT * FROM hospital_websites WHERE hospital_id = ?',
      [hospitalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = result.rows[0];
    res.json({
      id: website.id,
      hospitalId: website.hospital_id,
      domainName: website.domain_name,
      subdomain: website.subdomain,
      title: website.title,
      description: website.description,
      logoUrl: website.logo_url,
      faviconUrl: website.favicon_url,
      themeId: website.theme_id,
      isPublished: website.is_published,
      customCss: website.custom_css,
      analyticsCode: website.analytics_code,
      contactEmail: website.contact_email,
      contactPhone: website.contact_phone,
      socialLinks: website.social_links,
      seoSettings: website.seo_settings,
      createdAt: website.created_at,
      updatedAt: website.updated_at
    } as HospitalWebsite);
  } catch (error) {
    console.error('Get website error:', error);
    res.status(500).json({ error: 'Failed to get website' });
  }
};

export const handleUpdateWebsite: RequestHandler = async (req, res) => {
  try {
    const updateData: UpdateWebsiteRequest = req.body;
    const hospitalId = req.session?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({ error: 'Hospital authentication required' });
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = NOW()');
    values.push(hospitalId);

    await query(
      `UPDATE hospital_websites SET ${fields.join(', ')} WHERE hospital_id = ?`,
      values
    );

    // Get the updated website
    const result = await query(
      'SELECT * FROM hospital_websites WHERE hospital_id = ?',
      [hospitalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = result.rows[0];
    res.json({
      id: website.id,
      hospitalId: website.hospital_id,
      domainName: website.domain_name,
      subdomain: website.subdomain,
      title: website.title,
      description: website.description,
      logoUrl: website.logo_url,
      faviconUrl: website.favicon_url,
      themeId: website.theme_id,
      isPublished: website.is_published,
      customCss: website.custom_css,
      analyticsCode: website.analytics_code,
      contactEmail: website.contact_email,
      contactPhone: website.contact_phone,
      socialLinks: website.social_links,
      seoSettings: website.seo_settings,
      createdAt: website.created_at,
      updatedAt: website.updated_at
    } as HospitalWebsite);
  } catch (error) {
    console.error('Update website error:', error);
    res.status(500).json({ error: 'Failed to update website' });
  }
};

export const handlePublishWebsite: RequestHandler = async (req, res) => {
  try {
    const hospitalId = req.session?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({ error: 'Hospital authentication required' });
    }

    await query(
      'UPDATE hospital_websites SET is_published = true, updated_at = NOW() WHERE hospital_id = ?',
      [hospitalId]
    );

    // Check if website exists
    const result = await query(
      'SELECT * FROM hospital_websites WHERE hospital_id = ?',
      [hospitalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    res.json({ success: true, message: 'Website published successfully' });
  } catch (error) {
    console.error('Publish website error:', error);
    res.status(500).json({ error: 'Failed to publish website' });
  }
};

// Theme Management
export const handleListThemes: RequestHandler = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM website_themes WHERE is_active = true ORDER BY name'
    );

    const themes = result.rows.map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      previewImageUrl: theme.preview_image_url,
      cssTemplate: theme.css_template,
      layoutConfig: theme.layout_config,
      colorScheme: theme.color_scheme,
      fontSettings: theme.font_settings,
      isActive: theme.is_active,
      createdAt: theme.created_at,
      updatedAt: theme.updated_at
    } as WebsiteTheme));

    res.json(themes);
  } catch (error) {
    console.error('List themes error:', error);
    res.status(500).json({ error: 'Failed to list themes' });
  }
};

// Page Management
export const handleListPages: RequestHandler = async (req, res) => {
  try {
    const hospitalId = req.session?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({ error: 'Hospital authentication required' });
    }

    const result = await query(
      `SELECT p.* FROM website_pages p
       JOIN hospital_websites w ON p.website_id = w.id
       WHERE w.hospital_id = ?
       ORDER BY p.sort_order`,
      [hospitalId]
    );

    const pages = result.rows.map(page => ({
      id: page.id,
      websiteId: page.website_id,
      slug: page.slug,
      title: page.title,
      metaDescription: page.meta_description,
      content: page.content,
      isPublished: page.is_published,
      sortOrder: page.sort_order,
      createdAt: page.created_at,
      updatedAt: page.updated_at
    } as WebsitePage));

    res.json(pages);
  } catch (error) {
    console.error('List pages error:', error);
    res.status(500).json({ error: 'Failed to list pages' });
  }
};

export const handleGetPage: RequestHandler = async (req, res) => {
  try {
    const { pageId } = req.params;
    const hospitalId = req.session?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({ error: 'Hospital authentication required' });
    }

    const result = await query(
      `SELECT p.* FROM website_pages p
       JOIN hospital_websites w ON p.website_id = w.id
       WHERE p.id = ? AND w.hospital_id = ?`,
      [pageId, hospitalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = result.rows[0];
    res.json({
      id: page.id,
      websiteId: page.website_id,
      slug: page.slug,
      title: page.title,
      metaDescription: page.meta_description,
      content: page.content,
      isPublished: page.is_published,
      sortOrder: page.sort_order,
      createdAt: page.created_at,
      updatedAt: page.updated_at
    } as WebsitePage);
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ error: 'Failed to get page' });
  }
};

export const handleUpdatePage: RequestHandler = async (req, res) => {
  try {
    const { pageId } = req.params;
    const updateData: UpdatePageRequest = req.body;
    const hospitalId = req.session?.hospitalId;

    if (!hospitalId) {
      return res.status(401).json({ error: 'Hospital authentication required' });
    }

    // Verify page belongs to hospital
    const pageCheck = await query(
      `SELECT p.id FROM website_pages p
       JOIN hospital_websites w ON p.website_id = w.id
       WHERE p.id = ? AND w.hospital_id = ?`,
      [pageId, hospitalId]
    );

    if (pageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = NOW()');
    values.push(pageId);

    await query(
      `UPDATE website_pages SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Get the updated page
    const result = await query(
      'SELECT * FROM website_pages WHERE id = ?',
      [pageId]
    );

    const page = result.rows[0];
    res.json({
      id: page.id,
      websiteId: page.website_id,
      slug: page.slug,
      title: page.title,
      metaDescription: page.meta_description,
      content: page.content,
      isPublished: page.is_published,
      sortOrder: page.sort_order,
      createdAt: page.created_at,
      updatedAt: page.updated_at
    } as WebsitePage);
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
};