-- Test if videos table has data and check RLS settings
-- Run this in Supabase SQL Editor

-- 1. Check if videos table has any data
SELECT COUNT(*) as total_videos FROM videos;

-- 2. Check published videos
SELECT COUNT(*) as published_videos FROM videos WHERE is_published = true;

-- 3. Show sample videos
SELECT id, title, is_published, created_at, season, day 
FROM videos 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check if RLS is enabled on videos table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'videos';

-- 5. Check all policies on videos table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'videos';

-- 6. Test if service_role can access videos
-- This should return data if policies are correct
SET ROLE service_role;
SELECT COUNT(*) FROM videos;
RESET ROLE;
