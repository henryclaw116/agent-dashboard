-- Add MSI and Beelink as compute nodes (consoles)

-- Insert MSI as primary gateway console
INSERT INTO consoles (name, type, description, status, connection_info, capabilities)
VALUES (
    'MSI Gateway (Primary)',
    'openclaw-gateway',
    'Primary OpenClaw gateway on MSI workstation. Main control center.',
    'online',
    jsonb_build_object(
        'host', '192.168.0.97',
        'port', 18789,
        'url', 'ws://192.168.0.97:18789',
        'ssh', null,
        'is_primary', true
    ),
    ARRAY['sessions', 'sub-agents', 'browser', 'canvas', 'messaging', 'scheduling']
)
ON CONFLICT DO NOTHING;

-- Insert Beelink as compute node console
INSERT INTO consoles (name, type, description, status, connection_info, capabilities)
VALUES (
    'Beelink SER (Compute Node)',
    'openclaw-gateway',
    'Secondary OpenClaw gateway on Beelink SER mini PC. Dedicated compute node for heavy tasks.',
    'online',
    jsonb_build_object(
        'host', '192.168.0.91',
        'port', 18789,
        'url', 'ws://192.168.0.91:18789',
        'ssh', 'tony@192.168.0.91',
        'ssh_key', 'id_beelink',
        'is_primary', false
    ),
    ARRAY['sessions', 'sub-agents', 'browser', 'long-running-tasks', 'headless', 'compute']
)
ON CONFLICT DO NOTHING;

-- Add preferred_runtime column to agents table (for default runtime selection)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS preferred_runtime VARCHAR(50) DEFAULT 'msi';
COMMENT ON COLUMN agents.preferred_runtime IS 'Preferred compute runtime: msi (primary gateway) or beelink (compute node)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_agents_preferred_runtime ON agents(preferred_runtime);
