-- Disable Row Level Security on login_logs table to allow service role access
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'login_logs';
