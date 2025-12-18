-- Migration: Add notification settings to settings table
-- Run this in Supabase SQL Editor

-- Add notification columns to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS notify_country_change BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_ip_change BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_excessive_views BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS excessive_views_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS excessive_views_interval INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS notify_suspicious_activity BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_vpn_proxy BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_multiple_devices BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_odd_hours BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS odd_hours_start INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS odd_hours_end INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS webhook_security TEXT,
ADD COLUMN IF NOT EXISTS webhook_alerts TEXT,
ADD COLUMN IF NOT EXISTS webhook_uploads TEXT;

-- Update alerts table to support new alert types
ALTER TABLE alerts 
DROP CONSTRAINT IF EXISTS alerts_type_check;

ALTER TABLE alerts 
ADD CONSTRAINT alerts_type_check 
CHECK (type IN ('country_change', 'excessive_views', 'suspicious_activity', 'ip_change', 'vpn_proxy', 'multiple_devices', 'odd_hours'));
