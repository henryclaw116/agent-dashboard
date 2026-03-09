# Remote Desktop Console Access - Build Status

**Started:** 2026-03-09 09:53 AM MDT  
**Overall Progress:** 5% Complete

---

## Goal

Add "Connect" button to console cards that opens embedded remote desktop viewer in browser. Control any console remotely through the dashboard without external tools.

## Technology Decision

**Chosen: noVNC (VNC over WebSocket)**

**Why noVNC:**
- Pure JavaScript, runs in browser
- No plugins required
- WebSocket-based (easy backend proxy)
- Well-maintained, widely used
- Works with standard VNC servers

**Alternative (Guacamole):**
- Requires Java backend server
- More complex setup
- Overkill for our needs

**Plan:**
1. Add VNC connection info to consoles table
2. Backend WebSocket proxy (express-ws or ws library)
3. Frontend: noVNC library + modal
4. "Connect" button triggers modal with noVNC viewer

---

## Checkpoints

### ❌ Checkpoint 1: Database Schema Update (0%)
**Add to consoles table:**
- `vnc_host` (string)
- `vnc_port` (integer, default 5900)
- `vnc_password` (encrypted string, nullable)
- `vnc_enabled` (boolean, default false)

### ❌ Checkpoint 2: Backend WebSocket Proxy (0%)
**Create:**
- `backend/src/vnc-proxy.ts`
- WebSocket endpoint: `/api/vnc/:consoleId`
- Proxies VNC traffic between browser and VNC server
- Authentication check (only authorized users)

### ❌ Checkpoint 3: Frontend noVNC Integration (0%)
**Install & setup:**
- Add noVNC library to frontend
- Create `RemoteDesktopModal.tsx`
- noVNC viewer component
- Connection status UI

### ❌ Checkpoint 4: Console Card Connect Button (0%)
**Update Team.tsx console cards:**
- Add "Connect" button (only if vnc_enabled)
- Opens RemoteDesktopModal
- Passes console ID
- Shows connection status

### ❌ Checkpoint 5: Console Form VNC Settings (0%)
**Update ConsoleForm.tsx:**
- Add VNC configuration fields
- VNC host, port, password
- Enable/disable toggle
- Save to database

### ❌ Checkpoint 6: Testing (0%)
- Test VNC connection to actual server
- Verify WebSocket proxy works
- Test keyboard/mouse input
- Check different screen sizes
- Verify security (auth required)

### ❌ Checkpoint 7: Deploy & Verify (0%)
- Deploy backend (Railway)
- Deploy frontend (Vercel)
- Test deployed version
- Update dashboard to 100%

---

## Current Blocker

**None** - Starting Checkpoint 1 now

---

## Next Action

Update consoles table schema with VNC connection fields
