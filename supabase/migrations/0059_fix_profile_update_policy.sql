-- Migration 0059: Allow users to update their own profiles
-- This is necessary for the force-password-reset flow to work,
-- as well as for users to update their own profile information.

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
