# Adding New Consoles - Quick Start Guide

**For:** Adding 2 new mini PC consoles tomorrow (March 10, 2026)  
**Based on:** Beelink deployment (successful tonight)

---

## 📋 Fast Setup Checklist

### For Each New Console

#### 1. Ubuntu Setup (10 min)
- [ ] Install Ubuntu Server 22.04/24.04
- [ ] Set hostname (e.g., `minipc1`, `minipc2`)
- [ ] Create user: `tony`
- [ ] Enable SSH during install
- [ ] Get IP address

#### 2. Initial Config (5 min)
```bash
# From MSI, SSH to new console
ssh tony@<IP_ADDRESS>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (use same version as others)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v24.x
npm --version
```

#### 3. OpenClaw Install (5 min)
```bash
# Install globally
sudo npm install -g openclaw

# Verify
openclaw --version

# Install gateway service
openclaw gateway install --bind=lan

# Should auto-start
openclaw gateway status
```

#### 4. SSH Key Setup (2 min)
```bash
# On MSI, create dedicated key
ssh-keygen -t ed25519 -f ~/.ssh/id_minipc1 -N ""

# Copy to console
ssh-copy-id -i ~/.ssh/id_minipc1.pub tony@<IP_ADDRESS>

# Add to SSH config
notepad ~/.ssh/config
```

Add:
```
Host minipc1
    HostName <IP_ADDRESS>
    User tony
    IdentityFile ~/.ssh/id_minipc1
```

Test: `ssh minipc1`

#### 5. Database Migration (1 min)

Edit file: `database/migrations/006_add_new_consoles.sql`

```sql
-- Add MiniPC1 console
INSERT INTO consoles (name, type, description, status, connection_info, capabilities)
VALUES (
    'MiniPC1 (Compute Node)',
    'openclaw-gateway',
    'Mini PC #1 - Dedicated compute node',
    'online',
    jsonb_build_object(
        'host', '<IP_ADDRESS_1>',
        'port', 18789,
        'url', 'ws://<IP_ADDRESS_1>:18789',
        'ssh', 'tony@<IP_ADDRESS_1>',
        'ssh_key', 'id_minipc1',
        'is_primary', false
    ),
    ARRAY['sessions', 'sub-agents', 'browser', 'long-running-tasks', 'headless', 'compute']
);

-- Add MiniPC2 console
INSERT INTO consoles (name, type, description, status, connection_info, capabilities)
VALUES (
    'MiniPC2 (Compute Node)',
    'openclaw-gateway',
    'Mini PC #2 - Dedicated compute node',
    'online',
    jsonb_build_object(
        'host', '<IP_ADDRESS_2>',
        'port', 18789,
        'url', 'ws://<IP_ADDRESS_2>:18789',
        'ssh', 'tony@<IP_ADDRESS_2>',
        'ssh_key', 'id_minipc2',
        'is_primary', false
    ),
    ARRAY['sessions', 'sub-agents', 'browser', 'long-running-tasks', 'headless', 'compute']
);
```

Run migration:
```bash
cd C:\Users\reall\.openclaw\workspace\agent-dashboard
node run-migration.js  # (update to use 006 migration)
```

#### 6. Update Frontend (1 min)

Edit: `frontend/src/components/AgentForm.tsx`

Add new options to runtime dropdown:
```tsx
<select
  value={formData.preferred_runtime}
  onChange={(e) => setFormData({ ...formData, preferred_runtime: e.target.value })}
  className="..."
>
  <option value="msi">MSI (Primary Gateway)</option>
  <option value="beelink">Beelink (Compute Node)</option>
  <option value="minipc1">MiniPC1 (Compute Node)</option>
  <option value="minipc2">MiniPC2 (Compute Node)</option>
</select>
```

Update type in `frontend/src/types/index.ts`:
```typescript
preferred_runtime?: 'msi' | 'beelink' | 'minipc1' | 'minipc2';
```

#### 7. Update Backend (2 min)

Edit: `backend/src/routes/subagent.routes.ts`

Add SSH commands for new consoles:
```typescript
if (runtime === 'beelink') {
  // existing code
} else if (runtime === 'minipc1') {
  consoleName = 'MiniPC1 (Compute Node)';
} else if (runtime === 'minipc2') {
  consoleName = 'MiniPC2 (Compute Node)';
} else {
  // MSI (existing code)
}
```

#### 8. Test (2 min)

```bash
# Test API
curl http://localhost:3002/api/subagents/runtimes

# Should show 4 consoles:
# - MSI Gateway (Primary)
# - Beelink SER
# - MiniPC1
# - MiniPC2

# Test spawn
curl -X POST http://localhost:3002/api/subagents/spawn \
  -H "Content-Type: application/json" \
  -d '{"task":"Test task","runtime":"minipc1"}'

# Should return success with minipc1 console info
```

---

## ⚡ Express Setup (All Steps Combined)

**Estimated Total Time: ~30 minutes per console**

### Pre-Requisites
- [ ] Both mini PCs have Ubuntu installed
- [ ] You have their IP addresses
- [ ] SSH access working

### One-Command Setup (Run on MSI)

Create this script: `setup-new-console.ps1`

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$ConsoleName,  # e.g., "minipc1"
    
    [Parameter(Mandatory=$true)]
    [string]$IPAddress,
    
    [Parameter(Mandatory=$true)]
    [string]$DisplayName   # e.g., "MiniPC1 (Compute Node)"
)

Write-Host "🚀 Setting up $ConsoleName at $IPAddress..."

# 1. Create SSH key
Write-Host "📝 Creating SSH key..."
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_$ConsoleName" -N '""'

# 2. Add to SSH config
Write-Host "⚙️ Updating SSH config..."
@"

Host $ConsoleName
    HostName $IPAddress
    User tony
    IdentityFile ~/.ssh/id_$ConsoleName
"@ | Out-File -Append -Encoding utf8 "$env:USERPROFILE\.ssh\config"

# 3. Copy public key
Write-Host "🔑 Copying SSH key to console..."
Write-Host "⚠️ You'll need to enter the password for tony@$IPAddress once:"
cat "$env:USERPROFILE\.ssh\id_$ConsoleName.pub" | ssh tony@$IPAddress "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 4. Install Node.js and OpenClaw
Write-Host "📦 Installing Node.js and OpenClaw..."
ssh $ConsoleName @"
    sudo apt update && 
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && 
    sudo apt install -y nodejs && 
    sudo npm install -g openclaw && 
    openclaw gateway install --bind=lan && 
    openclaw gateway status
"@

Write-Host "✅ $ConsoleName setup complete!"
Write-Host "Next: Add to database and update dashboard UI"
```

Run for each console:
```powershell
.\setup-new-console.ps1 -ConsoleName "minipc1" -IPAddress "192.168.0.XX" -DisplayName "MiniPC1 (Compute Node)"
.\setup-new-console.ps1 -ConsoleName "minipc2" -IPAddress "192.168.0.YY" -DisplayName "MiniPC2 (Compute Node)"
```

Then just:
1. Run database migration
2. Update frontend dropdown
3. Restart backend
4. Test!

---

## 🎯 Agent Assignment Strategy

With 4 compute nodes, suggested distribution:

```
MSI (Primary)
├─ Marketing Agent (quick responses)
├─ Business Strategy Agent (analytics)
└─ Customer Success Agent (user interaction)

Beelink SER
├─ Development Agent (web apps, APIs)
└─ Operations Agent (deployments)

MiniPC1
├─ Content Agent (video processing)
└─ Social Media Agent (scheduled posts)

MiniPC2
├─ Financial Agent (data analysis)
└─ Research Agent (web scraping, data gathering)
```

Or by workload type:
```
MSI → Interactive/user-facing agents
Beelink → Development/DevOps tasks
MiniPC1 → Media processing
MiniPC2 → Data/research tasks
```

---

## 📝 Tomorrow's Workflow

**Step 1:** Setup hardware (Ubuntu install, IPs)  
**Step 2:** Run setup script for both consoles  
**Step 3:** Create & run migration 006  
**Step 4:** Update frontend dropdown  
**Step 5:** Update backend routing  
**Step 6:** Test all 4 runtimes  
**Step 7:** Configure agents  
**Step 8:** Done! ✅

**Total Estimated Time:** 1-2 hours for both consoles

---

## 🔧 Files to Update

1. **Database:** `database/migrations/006_add_new_consoles.sql` (create new)
2. **Frontend:** `frontend/src/components/AgentForm.tsx` (add dropdown options)
3. **Frontend:** `frontend/src/types/index.ts` (update type)
4. **Backend:** `backend/src/routes/subagent.routes.ts` (add runtime cases)

That's it! Same pattern as Beelink tonight.

---

## ✅ Success Criteria

After setup, verify:
- [ ] `curl http://localhost:3002/api/subagents/runtimes` shows all 4 consoles
- [ ] All 4 consoles show status: "online"
- [ ] Agent form dropdown has all 4 options
- [ ] Can spawn tasks on each console via API
- [ ] SSH keys work for all consoles

---

**READY FOR TOMORROW!** 🚀

Follow this guide and the 2 new consoles will be integrated in ~2 hours.
