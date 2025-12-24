-- Fix RLS policies for bot access to members table
-- Run this in Supabase SQL Editor

-- Check current policies on members table
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'members';

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Service role can access all members" ON members;
DROP POLICY IF EXISTS "Allow service role full access to members" ON members;

-- Create policy for service role (used by bot)
CREATE POLICY "Service role full access to members"
ON members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also ensure authenticated users can read members (for website)
DROP POLICY IF EXISTS "Authenticated users can read members" ON members;

CREATE POLICY "Authenticated users can read members"
ON members
FOR SELECT
TO authenticated
USING (true);

-- Verify policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'members';
