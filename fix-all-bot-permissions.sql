-- Fix all RLS policies for Discord bot access
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. MEMBERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access to members" ON members;
DROP POLICY IF EXISTS "Authenticated users can read members" ON members;

CREATE POLICY "Service role full access to members"
ON members FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read members"
ON members FOR SELECT TO authenticated
USING (true);

-- ============================================
-- 2. VIDEOS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access to videos" ON videos;
DROP POLICY IF EXISTS "Authenticated users read published videos" ON videos;

CREATE POLICY "Service role full access to videos"
ON videos FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users read published videos"
ON videos FOR SELECT TO authenticated
USING (is_published = true);

-- ============================================
-- 3. VIEW_SESSIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access to view_sessions" ON view_sessions;
DROP POLICY IF EXISTS "Authenticated users read own sessions" ON view_sessions;

CREATE POLICY "Service role full access to view_sessions"
ON view_sessions FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users read own sessions"
ON view_sessions FOR SELECT TO authenticated
USING (true);

-- ============================================
-- 4. SETTINGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Service role full access to settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users read settings" ON settings;

CREATE POLICY "Service role full access to settings"
ON settings FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users read settings"
ON settings FOR SELECT TO authenticated
USING (true);

-- ============================================
-- 5. ALERTS TABLE (if exists)
-- ============================================
DROP POLICY IF EXISTS "Service role full access to alerts" ON alerts;

CREATE POLICY "Service role full access to alerts"
ON alerts FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================
-- VERIFY ALL POLICIES
-- ============================================
SELECT 
  tablename, 
  policyname, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('members', 'videos', 'view_sessions', 'settings', 'alerts')
ORDER BY tablename, policyname;
