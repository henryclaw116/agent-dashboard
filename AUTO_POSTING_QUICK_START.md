# Auto-Posting Quick Start

## 🚀 Your Auto-Send Button Now Actually Posts!

### ✅ What's Ready

**Backend deployed to Railway** with full auto-posting system ✅
**auto-post.js updated** to output reply URLs ✅
**Frontend unchanged** - Auto-Send button works as-is ✅

---

## 📋 3 Steps to Activate

### **Step 1: Add Environment Variables to Railway** (2 minutes)

Go to: https://railway.app/dashboard

1. Find your backend service
2. Go to **Variables** tab
3. Add these two variables:

```
GATEWAY_URL=http://localhost:18791
GATEWAY_TOKEN=607612b7f4902ecdcaa20b9f98501a04b3fd2995a7b5fcfa
```

4. Click **Deploy** to restart with new variables

---

### **Step 2: Ensure Gateway is Running** (1 minute)

On your MSI console, run:

```bash
openclaw status
```

Should show:
```
✅ Gateway running
✅ Session active
```

If not running:
```bash
openclaw gateway start
```

---

### **Step 3: Test It!** (2 minutes)

1. Go to: https://rlt-agent-dashboard.vercel.app/social-media
2. Find an approved lead
3. Click **"Auto-Send"**
4. Watch it post automatically! 🎉

---

## 🎯 What Happens When You Click Auto-Send

```
You click "Auto-Send"
  ↓
Backend approves lead
  ↓  
Backend calls Gateway on MSI console
  ↓
Gateway runs: node auto-post.js [lead-id]
  ↓
auto-post.js launches Chrome
  ↓
Chrome navigates to post
  ↓
Chrome types and submits reply
  ↓
Reply URL saved
  ↓
Dashboard updates: Status = SENT ✅
```

**All automatic - no copy/paste!**

---

## 🔧 Chrome Profile Issue (Optional)

If you get "Chrome profile locked" error:

**Quick Fix:**
- Close Chrome browser before clicking Auto-Send

**Permanent Fix:** (5 minutes)
Create separate automation profile:

```bash
cd C:\Users\reall\.openclaw\workspace\social-pipeline
```

Edit `auto-post.js`, find this line:
```javascript
const options = new chrome.Options();
```

Add below it:
```javascript
options.addArguments('--user-data-dir=C:\\Users\\reall\\ChromeAutomation');
```

Now automation uses its own Chrome profile!

---

## 🎉 That's It!

**Once Railway variables are set:**
1. Click Auto-Send
2. Lead posts automatically
3. Dashboard shows SENT status
4. Reply URL captured

**Full automation - no manual work!** 🚀

---

## 🚨 Troubleshooting

**"Gateway token not configured"**
- Variables not set in Railway
- Go back to Step 1

**"Chrome profile locked"**
- Close Chrome browser
- Or set up separate profile (see above)

**"Posting failed"**
- Check Railway logs
- Check Gateway logs (`openclaw logs`)
- Test manually: `node auto-post.js 1`

---

## 📞 Help

See full documentation: `AUTO_POSTING_SETUP.md`

Or just test it - it should work once Step 1 is done! ✅
