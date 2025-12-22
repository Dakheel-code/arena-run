-- Check member data and related sessions/logs

-- 1. Check members table
SELECT discord_id, discord_username, game_id 
FROM members 
LIMIT 5;

-- 2. Check watch_sessions table
SELECT discord_id, video_id, started_at 
FROM watch_sessions 
LIMIT 5;

-- 3. Check login_logs table
SELECT discord_id, logged_in_at, country 
FROM login_logs 
LIMIT 5;

-- 4. Check if discord_id matches between tables
SELECT 
  m.discord_id as member_discord_id,
  m.discord_username,
  COUNT(DISTINCT ws.id) as session_count,
  COUNT(DISTINCT ll.id) as login_count
FROM members m
LEFT JOIN watch_sessions ws ON m.discord_id = ws.discord_id
LEFT JOIN login_logs ll ON m.discord_id = ll.discord_id
GROUP BY m.discord_id, m.discord_username
ORDER BY session_count DESC, login_count DESC
LIMIT 10;

-- 5. Check for orphaned sessions (sessions without matching member)
SELECT DISTINCT ws.discord_id
FROM watch_sessions ws
LEFT JOIN members m ON ws.discord_id = m.discord_id
WHERE m.discord_id IS NULL
LIMIT 5;

-- 6. Check for orphaned login logs
SELECT DISTINCT ll.discord_id
FROM login_logs ll
LEFT JOIN members m ON ll.discord_id = m.discord_id
WHERE m.discord_id IS NULL
LIMIT 5;
