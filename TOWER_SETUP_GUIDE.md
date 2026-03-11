# Tower Console Setup Guide - Social Media AI Scanner

## Hardware Specs
- **CPU:** (TBD - will detect during setup)
- **RAM:** 64GB
- **Storage:** 4TB SSD
- **GPU:** NVIDIA GeForce RTX 3090
- **Purpose:** 24/7 Social Media Scanning with Local AI (Ollama)

## Pre-Setup Checklist (Before Installation)

### 1. Hardware Setup
- [ ] Tower connected to power
- [ ] Ethernet cable connected (or WiFi configured)
- [ ] Display/keyboard/mouse connected for initial setup
- [ ] Know the local IP address (will get during setup)

### 2. OS Requirements
**Recommended:** Ubuntu Server 24.04 LTS (same as MSI S1)
- Headless setup (no GUI needed)
- Optimized for 24/7 operation
- Good GPU driver support for RTX 3090

**Alternative:** Windows 11 (if preferred)

### 3. Network Info Needed
- Static IP or DHCP reservation recommended
- SSH access required
- Port 18789 for OpenClaw Gateway
- Port 11434 for Ollama API

## Installation Steps (Run When Ready)

### STEP 1: Install Ubuntu Server (Manual)
1. Create Ubuntu Server 24.04 USB installer
2. Boot from USB
3. Install with these settings:
   - Hostname: `rlt-tower` or `social-scanner`
   - Username: `tony` (for consistency)
   - Enable SSH during install
   - Skip GUI/Desktop packages
   - Install OpenSSH server

### STEP 2: Run Auto-Setup Script (Remote via SSH)

**From your main PC:**
```powershell
# Copy setup script to tower
scp C:\Users\reall\.openclaw\workspace\scripts\tower-setup.sh tony@<TOWER_IP>:~/

# SSH into tower
ssh tony@<TOWER_IP>

# Run setup script
chmod +x ~/tower-setup.sh
sudo ~/tower-setup.sh
```

The script will:
- ✅ Update system packages
- ✅ Install NVIDIA drivers for RTX 3090
- ✅ Install Docker + Docker Compose
- ✅ Install Ollama with GPU support
- ✅ Download recommended AI models (llama3.1, mistral)
- ✅ Install Node.js v22.x
- ✅ Install OpenClaw Gateway
- ✅ Configure auto-start on boot
- ✅ Set up passwordless sudo
- ✅ Generate SSH key for automation
- ✅ Configure firewall
- ✅ Set up auto-reboot on power loss

### STEP 3: Configure OpenClaw Gateway

**Run on tower:**
```bash
# Initialize OpenClaw
openclaw init

# Configure gateway for LAN access
openclaw gateway config set --bind 0.0.0.0 --port 18789

# Start gateway with auto-restart
pm2 start "openclaw gateway start" --name openclaw-gateway
pm2 startup
pm2 save
```

### STEP 4: Add to Dashboard (Automated)

**From main PC:**
```powershell
# Run this after tower is online
.\scripts\register-tower-console.ps1 -IP <TOWER_IP>
```

This will:
- Add tower to `consoles` table
- Assign Console ID
- Generate gateway token
- Update dashboard

### STEP 5: Deploy Social Media Scanner Agent

**Automatic deployment:**
```bash
# On tower via SSH
cd ~/agents
git clone https://github.com/henryclaw116/social-media-scanner.git
cd social-media-scanner
npm install

# Start agent with PM2
pm2 start index.js --name social-scanner
pm2 save
```

## Ollama Setup Details

### GPU Acceleration
RTX 3090 has 24GB VRAM - perfect for running large models locally!

**Recommended models for social media analysis:**
1. **llama3.1:8b** - Fast, efficient for sentiment analysis
2. **mistral:7b** - Great for intent detection
3. **dolphin-mixtral** - Multi-task reasoning
4. **nomic-embed-text** - Embeddings for similarity search

**Install models:**
```bash
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull nomic-embed-text
```

### Ollama API Configuration
```bash
# Ollama runs on http://localhost:11434 by default
# To allow network access:
export OLLAMA_HOST=0.0.0.0:11434

# Add to ~/.bashrc for persistence
echo 'export OLLAMA_HOST=0.0.0.0:11434' >> ~/.bashrc
```

## Social Media Scanner Configuration

### What It Will Monitor
1. **Reddit**
   - r/options, r/investing, r/stocks, r/thetagang
   - Keywords: "credit spreads", "options trading", "need help", "learning to trade"
   
2. **Twitter/X**
   - #OptionsTrading, #ThetaGang, #CreditSpreads
   - Replies to popular trading accounts
   
3. **YouTube Comments**
   - Comments on competitor videos
   - Questions about options trading
   
4. **Facebook Groups** (if accessible)
   - Trading education groups
   - Options trading communities

### Scanning Strategy
- **Frequency:** Every 15 minutes
- **Hours:** 24/7 (true continuous monitoring)
- **Storage:** PostgreSQL database (link to main Supabase)
- **Lead scoring:** AI-powered intent detection
- **Output:** Daily summary + real-time alerts for hot leads

### Lead Qualification Criteria
AI will score leads 0-100 based on:
- ✅ Expressed frustration with current trading
- ✅ Asking for help/education
- ✅ Mentioned options/credit spreads
- ✅ Not promoting competing services
- ✅ Recent post (< 24 hours old)
- ❌ Negative sentiment about education
- ❌ Unrealistic get-rich-quick mindset

## Auto-Reboot Configuration

### On Power Loss (All Consoles)

**Ubuntu/Linux (Tower, MSI S1, Beelink):**
```bash
# BIOS: Enable "Restore on AC/Power Loss" or "After Power Loss: Power On"
# This is hardware-level, set in BIOS

# Software: systemd service to restart OpenClaw/services
sudo systemctl enable openclaw-gateway
sudo systemctl enable pm2-tony
```

**Windows (MSI Main PC):**
```powershell
# Enable auto-restart after power failure
powercfg /hibernate off
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon /t REG_SZ /d 1 /f
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultUserName /t REG_SZ /d "reall" /f

# Task Scheduler: Run on startup
# Already configured for OpenClaw Gateway
```

## Security Considerations

### SSH Hardening
```bash
# Disable password auth (key-only)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Fail2ban for brute-force protection
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### Firewall Rules
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 18789/tcp   # OpenClaw Gateway
sudo ufw allow 11434/tcp   # Ollama API (internal network only)
sudo ufw enable
```

## Monitoring & Health Checks

### Pipeline Integration
Tower will report to Pipeline dashboard:
- Social media scan tasks (every 15 min)
- Lead discovery count
- AI model performance
- GPU utilization
- Uptime

### Heartbeat
```bash
# Cron job to check health every 5 minutes
*/5 * * * * /home/tony/agents/social-scanner/healthcheck.sh
```

## Expected Performance

### With RTX 3090 + 64GB RAM:
- **Ollama inference:** ~50-100 tokens/sec
- **Concurrent scans:** 10-20 platforms simultaneously
- **Lead processing:** 1000s of posts/hour
- **Memory usage:** ~20-30GB (models loaded)
- **GPU usage:** 60-80% under load

### Power Consumption:
- RTX 3090: ~350W under load
- System total: ~400-500W
- Monthly cost: ~$50-70 (24/7 operation)

## Troubleshooting

### GPU Not Detected
```bash
# Check NVIDIA driver
nvidia-smi

# Reinstall if needed
sudo apt install nvidia-driver-535 -y
sudo reboot
```

### Ollama Not Using GPU
```bash
# Check Ollama logs
journalctl -u ollama -f

# Verify GPU available to Docker
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

### Scanner Agent Issues
```bash
# Check PM2 logs
pm2 logs social-scanner

# Restart agent
pm2 restart social-scanner
```

## Next Steps After Installation

1. ✅ Verify tower shows in dashboard (`/pipeline` tab)
2. ✅ Test Ollama API: `curl http://tower-ip:11434/api/generate -d '{"model":"llama3.1:8b","prompt":"test"}'`
3. ✅ Confirm social scanner is finding leads
4. ✅ Review first batch of leads in dashboard
5. ✅ Adjust lead scoring thresholds if needed

## Files Ready for You

### Scripts:
- `scripts/tower-setup.sh` - Full Ubuntu setup automation
- `scripts/register-tower-console.ps1` - Add to dashboard
- `scripts/setup-auto-reboot.sh` - Configure all consoles for auto-restart

### Documentation:
- This file - Complete setup guide
- `SOCIAL_SCANNER_CONFIG.md` - Detailed scanner configuration

**When you say "GO", just run the scripts and you'll be up in 30 minutes!** 🚀
