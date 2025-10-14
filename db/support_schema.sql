-- Support Module Database Schema
-- This schema creates tables for managing support tickets and responses

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request', 'bug_report', 'account', 'integration', 'training')),
    created_by UUID NOT NULL, -- References staff_users.id or can be anonymous
    assigned_to UUID, -- References staff_users.id for support staff assignment
    school_id UUID, -- References schools.id for school-specific tickets
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
    
    -- Foreign key constraints (commented out to avoid dependency issues)
    -- FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
    -- FOREIGN KEY (assigned_to) REFERENCES staff_users(id) ON DELETE SET NULL,
    -- FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Ticket Responses Table
CREATE TABLE IF NOT EXISTS ticket_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_by UUID NOT NULL, -- References staff_users.id or can be anonymous
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_internal BOOLEAN DEFAULT FALSE, -- For internal staff notes
    
    -- Foreign key constraints
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    -- FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

-- Support Categories Table (for dynamic category management)
CREATE TABLE IF NOT EXISTS support_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Ticket Attachments Table (for future file upload support)
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID,
    response_id UUID,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Either ticket_id or response_id should be set, but not both
    CHECK ((ticket_id IS NOT NULL AND response_id IS NULL) OR (ticket_id IS NULL AND response_id IS NOT NULL)),
    
    -- Foreign key constraints
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (response_id) REFERENCES ticket_responses(id) ON DELETE CASCADE
    -- FOREIGN KEY (uploaded_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

-- Support Knowledge Base Articles Table (for future knowledge base feature)
CREATE TABLE IF NOT EXISTS support_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category_id UUID,
    tags TEXT[], -- Array of tags for better searchability
    is_published BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraints
    FOREIGN KEY (category_id) REFERENCES support_categories(id) ON DELETE SET NULL
    -- FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
    -- FOREIGN KEY (updated_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

-- Support Ticket Tags Table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS ticket_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate tags on same ticket
    UNIQUE (ticket_id, tag_name)
);

-- Support Ticket History Table (for audit trail)
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    field_name VARCHAR(50) NOT NULL, -- e.g., 'status', 'priority', 'assigned_to'
    old_value TEXT,
    new_value TEXT,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    -- FOREIGN KEY (changed_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

-- Insert default support categories
INSERT INTO support_categories (name, description, color, is_active) VALUES
    ('general', 'General inquiries and questions', '#6B7280', TRUE),
    ('technical', 'Technical issues and bugs', '#EF4444', TRUE),
    ('billing', 'Billing and subscription related', '#F59E0B', TRUE),
    ('feature_request', 'New feature requests', '#10B981', TRUE),
    ('bug_report', 'Bug reports and issues', '#EF4444', TRUE),
    ('account', 'Account management and access', '#8B5CF6', TRUE),
    ('integration', 'Third-party integrations', '#06B6D4', TRUE),
    ('training', 'Training and how-to questions', '#F97316', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set resolved_at when status changes to resolved or closed
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
        NEW.resolved_at = NOW();
    ELSIF NEW.status NOT IN ('resolved', 'closed') AND OLD.status IN ('resolved', 'closed') THEN
        NEW.resolved_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_support_ticket_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_updated_at();

-- Create a function to log ticket changes to history table
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO ticket_history (ticket_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, 'status', OLD.status, NEW.status, NEW.updated_by);
    END IF;
    
    -- Log priority changes
    IF OLD.priority != NEW.priority THEN
        INSERT INTO ticket_history (ticket_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, 'priority', OLD.priority, NEW.priority, NEW.updated_by);
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO ticket_history (ticket_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT, NEW.updated_by);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The history trigger is commented out as it requires an updated_by field
-- CREATE TRIGGER trigger_log_ticket_changes
--     AFTER UPDATE ON support_tickets
--     FOR EACH ROW
--     EXECUTE FUNCTION log_ticket_changes();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_school_id ON support_tickets(school_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON support_tickets(updated_at);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_created_by ON ticket_responses(created_by);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_created_at ON ticket_responses(created_at);

CREATE INDEX IF NOT EXISTS idx_support_categories_name ON support_categories(name);
CREATE INDEX IF NOT EXISTS idx_support_categories_is_active ON support_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_response_id ON ticket_attachments(response_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploaded_by ON ticket_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_support_articles_category_id ON support_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_support_articles_is_published ON support_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_support_articles_created_by ON support_articles(created_by);
CREATE INDEX IF NOT EXISTS idx_support_articles_tags ON support_articles USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket_id ON ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag_name ON ticket_tags(tag_name);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_field_name ON ticket_history(field_name);
CREATE INDEX IF NOT EXISTS idx_ticket_history_changed_by ON ticket_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_ticket_history_changed_at ON ticket_history(changed_at);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_compound_status_priority ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_compound_category_status ON support_tickets(category, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_compound_school_status ON support_tickets(school_id, status) WHERE school_id IS NOT NULL;

-- Create a view for ticket statistics
CREATE OR REPLACE VIEW support_ticket_stats AS
SELECT 
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
    COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets,
    AVG(CASE 
        WHEN resolved_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
        ELSE NULL 
    END) as avg_resolution_hours,
    AVG(CASE 
        WHEN status IN ('resolved', 'closed') AND resolved_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
        ELSE NULL 
    END) as avg_closed_resolution_hours
FROM support_tickets;

-- Create a view for recent ticket activity
CREATE OR REPLACE VIEW recent_ticket_activity AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as tickets_created,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as tickets_resolved,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as tickets_closed
FROM support_tickets
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;