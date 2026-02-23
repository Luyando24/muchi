-- Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only system/admins can create notifications (for now, or maybe triggers)
-- For simplicity, let's allow users to insert notifications for themselves (e.g. testing)
-- or maybe restricted to admins if it's strictly system alerts.
-- Let's allow insert if user is authenticated (so backend logic can insert freely if using service role, but users might trigger some too)
CREATE POLICY "Users can insert own notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  
-- School admins can insert notifications for users in their school
-- This is tricky without a join in the policy which can be slow or complex.
-- For now, relying on service role in backend for cross-user notifications is safer.
