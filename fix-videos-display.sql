-- Fix videos display issue
-- Run this in Supabase SQL Editor

-- Step 1: Check if videos table exists and has data
SELECT COUNT(*) as total_videos FROM videos;
SELECT COUNT(*) as published_videos FROM videos WHERE is_published = true;

-- Step 2: Check RLS policies on videos table
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'videos';

-- Step 3: Disable RLS temporarily to test (ONLY FOR TESTING)
-- ALTER TABLE videos DISABLE ROW LEVEL SECURITY;

-- Step 4: Create a permissive policy for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to read published videos" ON videos;

CREATE POLICY "Allow authenticated users to read published videos"
ON videos
FOR SELECT
TO authenticated
USING (is_published = true);

-- Step 5: Create policy for service role to see all videos
DROP POLICY IF EXISTS "Allow service role full access" ON videos;

CREATE POLICY "Allow service role full access"
ON videos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 6: Verify policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'videos';
