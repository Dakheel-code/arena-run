-- Check if login logs exist in database
SELECT * FROM login_logs ORDER BY logged_at DESC LIMIT 10;

-- Count total login logs
SELECT COUNT(*) as total_logs FROM login_logs;

-- Check recent successful logins
SELECT 
  discord_username,
  discord_id,
  status,
  is_admin,
  ip_address,
  logged_at
FROM login_logs 
WHERE status = 'success'
ORDER BY logged_at DESC 
LIMIT 5;
