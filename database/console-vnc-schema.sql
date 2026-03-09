-- Add VNC connection fields to consoles table

ALTER TABLE consoles 
ADD COLUMN IF NOT EXISTS vnc_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS vnc_port INTEGER DEFAULT 5900,
ADD COLUMN IF NOT EXISTS vnc_password TEXT, -- Encrypted or plain (for now)
ADD COLUMN IF NOT EXISTS vnc_enabled BOOLEAN DEFAULT false;

-- Index for quick VNC-enabled lookups
CREATE INDEX IF NOT EXISTS idx_consoles_vnc_enabled ON consoles(vnc_enabled) WHERE vnc_enabled = true;

-- Comment
COMMENT ON COLUMN consoles.vnc_host IS 'VNC server hostname or IP address';
COMMENT ON COLUMN consoles.vnc_port IS 'VNC server port (default 5900)';
COMMENT ON COLUMN consoles.vnc_password IS 'VNC password for authentication';
COMMENT ON COLUMN consoles.vnc_enabled IS 'Whether remote desktop is enabled for this console';
