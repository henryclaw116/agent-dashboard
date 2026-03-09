-- Migration: Add VNC connection fields to consoles table
-- Purpose: Enable remote desktop access through dashboard
-- Created: 2026-03-09

ALTER TABLE consoles
ADD COLUMN vnc_host VARCHAR(255),
ADD COLUMN vnc_port INTEGER DEFAULT 5900,
ADD COLUMN vnc_password_encrypted TEXT,
ADD COLUMN vnc_enabled BOOLEAN DEFAULT false,
ADD COLUMN vnc_last_connected TIMESTAMP;

-- Add index for VNC-enabled consoles (performance)
CREATE INDEX idx_consoles_vnc_enabled ON consoles(vnc_enabled) WHERE vnc_enabled = true;

-- Comment for documentation
COMMENT ON COLUMN consoles.vnc_host IS 'VNC server hostname or IP';
COMMENT ON COLUMN consoles.vnc_port IS 'VNC server port (default 5900)';
COMMENT ON COLUMN consoles.vnc_password_encrypted IS 'Encrypted VNC password';
COMMENT ON COLUMN consoles.vnc_enabled IS 'Whether VNC access is enabled for this console';
COMMENT ON COLUMN consoles.vnc_last_connected IS 'Last successful VNC connection timestamp';
