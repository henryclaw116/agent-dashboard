# Agent Training System - Full Automation

## 🎓 What Was Built

A complete **automated machine learning system** that makes your agents smarter over time by learning from your feedback.

---

## 📊 How It Works

### **1. You Provide Feedback** (Manual)
When reviewing leads in the dashboard, you give feedback in TWO ways:

**A. Lead Quality Feedback** (green box)
- Tell agents why a lead was good or bad
- Examples:
  - "Score too high - should be 50 not 85"
  - "Perfect lead - clear pain, good routing"
  - "Wrong landing page - should use trial not course"

**B. Reply Writing Feedback** (yellow box)
- Tell agents what's wrong with the reply message
- Examples:
  - "Too formal, make it casual"
  - "Too long, shorten to 3 sentences"
  - "Don't mention free trial in first message"

### **2. System Collects Feedback** (Automatic)
- All your feedback stored in database
- Reply feedback → `training_feedback` table
- Lead quality feedback → `lead_quality_training` table

### **3. Weekly Training Runs** (Automatic)
**Every Monday at 6:00 AM MDT:**

1. **Analyze Feedback**
   - Reviews all feedback from past 7 days
   - Uses GPT-4o to extract patterns and lessons
   - Groups lessons by category (tone, length, scoring, routing, etc.)

2. **Generate Improved Prompts**
   - **Writer Agent:** New reply-writing prompt based on tone/length/content lessons
   - **Scorer Agent:** New scoring guidelines based on accuracy feedback
   - **Router Agent:** New routing rules based on landing page feedback

3. **Save Training Results**
   - Stores improved prompts in `agent_training_history` table
   - Tracks what was learned and when
   - Available for review in dashboard

4. **Agents Get Smarter**
   - Next time agents run, they use improved prompts
   - Performance improves over time
   - No manual intervention needed

---

## 🎯 Agent Types Trained

### **Writer Agent**
**Learns:** Reply tone, length, content, style

**Feedback Examples:**
- ✅ "Great! Keep this casual, friendly tone"
- ❌ "Too formal - use 'you' instead of 'one'"
- ❌ "Too long - cut to 3 sentences max"
- ❌ "Don't mention trial in first message"

**Improves:** Reply quality, conversion rate, engagement

### **Scorer Agent**
**Learns:** Lead scoring accuracy, quality indicators

**Feedback Examples:**
- ❌ "Score too high (85 should be 50) - just complaining, no real interest"
- ✅ "Perfect score (75) - clear pain, motivated user"
- ❌ "Score too low (40 should be 70) - strong buying signals"

**Improves:** Lead quality, fewer bad leads passed through

### **Router Agent**
**Learns:** Landing page selection for different pain points

**Feedback Examples:**
- ❌ "Wrong page - small account should get $200 Challenge not Consistency Course"
- ✅ "Perfect routing - losing money → Consistency Course"
- ❌ "Beginner should get Options Basics not Credit Spreads"

**Improves:** Landing page relevance, trial conversion

---

## 📅 Training Schedule

### **Automatic Training**
- **When:** Every Monday at 6:00 AM MDT
- **Duration:** 2-3 minutes
- **Trigger:** Automatic (cron job)

### **Manual Training**
- **When:** Anytime you want
- **How:** Click "Run Training Now" button in dashboard
- **Use Case:** Test improvements immediately

---

## 📈 Training Dashboard

**Access:** https://rlt-agent-dashboard.vercel.app/training

### **Features:**

**1. Training Stats**
- Total training cycles run
- Total lessons learned (reply + quality)
- Last training date
- Agents trained count

**2. Training History**
- See every training cycle
- Click to expand details
- View lessons learned
- See updated prompts

**3. Manual Training**
- "Run Training Now" button
- Triggers immediate analysis
- See results instantly

**4. Next Training Schedule**
- Shows when next automatic run happens
- Countdown to next Monday 6 AM

---

## 🔧 Technical Details

### **Backend Services**

**1. AgentTrainingService** (`agentTraining.service.ts`)
- Analyzes feedback patterns
- Generates improved prompts
- Saves training results
- Runs full training cycles

**2. Training API Routes** (`agentTraining.routes.ts`)
- `POST /api/agent-training/run` - Manual trigger
- `GET /api/agent-training/history` - View history
- `GET /api/agent-training/latest-prompts` - Get current prompts
- `GET /api/agent-training/stats` - Training statistics

**3. Weekly Cron Job** (`weeklyTrainingJob.ts`)
- Runs every Monday 6 AM
- Calls training service
- Logs results

### **Database Tables**

**1. agent_training_history**
```sql
id, writer_prompt, scorer_guidelines, router_rules,
reply_lessons_json, quality_lessons_json,
training_date, created_at
```

**2. training_feedback** (reply writing)
```sql
id, lead_id, feedback_text, original_reply,
improved_reply, created_at
```

**3. lead_quality_training** (scoring/routing)
```sql
id, lead_id, feedback_text, lead_score,
pain_category, selected_landing_page,
platform, final_status, created_at
```

### **Frontend**

**AgentTraining.tsx** - Full training dashboard
- Stats cards
- Training history timeline
- Expandable lesson details
- Manual training trigger

---

## 💡 How Agents Learn

### **Pattern Analysis**
GPT-4o analyzes all feedback and extracts:
- Common tone preferences
- Length preferences
- Content to include/exclude
- Scoring accuracy patterns
- Routing decision patterns

### **Lesson Extraction**
System identifies:
- **High confidence lessons** (90%+): Apply immediately
- **Medium confidence lessons** (60-90%): Apply with caution
- **Low confidence lessons** (<60%): Need more data

### **Prompt Generation**
For each agent type:
1. Load current prompt/guidelines
2. Review lessons learned
3. Generate improved version
4. Maintain brand voice/values
5. Save for next agent run

---

## 📊 Example Training Cycle

**Monday, March 18, 2026 - 6:00 AM MDT**

**Feedback Collected (Past Week):**
- 12 reply feedbacks
- 8 lead quality feedbacks

**Lessons Extracted:**

**Reply Writing:**
1. Tone: "Be more casual, less formal" (95% confidence)
2. Length: "Keep replies under 4 sentences" (88% confidence)
3. Content: "Don't mention free trial in first message" (92% confidence)

**Lead Quality:**
1. Scoring: "Lower scores for vague complaints" (85% confidence)
2. Routing: "Small account → $200 Challenge" (100% confidence)
3. Quality: "Reject one-word posts" (90% confidence)

**Prompts Updated:**
- ✅ Writer Agent: New prompt emphasizes casual tone, 3-4 sentence max
- ✅ Scorer Agent: Updated to penalize vague pain points
- ✅ Router Agent: Added small account → $200 Challenge rule

**Result:**
- Next week's replies are more casual and concise
- Fewer low-quality leads pass through scoring
- Better landing page matches

---

## 🚀 Getting Started

### **Step 1: Provide Feedback**
Start giving feedback on leads in Social Media → Lead Pipeline:
- Use green box for lead quality feedback
- Use yellow box for reply feedback
- Be specific and actionable

### **Step 2: Wait for Training**
- First training: Next Monday 6 AM
- Or click "Run Training Now" to test immediately

### **Step 3: Review Results**
Visit `/training` dashboard to see:
- What lessons were learned
- How prompts were updated
- Training statistics

### **Step 4: See Improvements**
- Replies get better over time
- Scoring becomes more accurate
- Routing decisions improve
- Less manual correction needed

---

## 🎯 Best Practices

### **Feedback Quality**

**DO:**
- ✅ Be specific: "Too long - shorten to 3 sentences"
- ✅ Explain why: "Score too high because pain is vague"
- ✅ Provide examples: "Should route small accounts to $200 Challenge"

**DON'T:**
- ❌ Be vague: "Bad reply"
- ❌ Skip context: "Wrong"
- ❌ Contradict yourself: Say opposite things on similar leads

### **Training Frequency**

**Weekly is optimal:**
- Enough data to find patterns
- Not so frequent that changes are chaotic
- Allows time to see improvements

**Manual triggers:**
- Use when you have 10+ new feedbacks
- Use to test major changes
- Don't overuse (weekly is better)

---

## 📁 Files Created

### **Backend**
- `backend/src/services/agentTraining.service.ts` - Core training logic
- `backend/src/routes/agentTraining.routes.ts` - API endpoints
- `backend/src/jobs/weeklyTrainingJob.ts` - Cron scheduler
- `backend/src/server.ts` - Updated with training routes

### **Frontend**
- `frontend/src/pages/AgentTraining.tsx` - Training dashboard
- `frontend/src/App.tsx` - Added /training route
- `frontend/src/components/Layout.tsx` - Added nav link

### **Database**
- `database/migrations/012_agent_training_system.sql` - Tables

---

## 🔐 Security & Safety

### **No Auto-Apply**
- Trained prompts are saved to database
- **Manual review recommended** before deploying to live agents
- You can reject/modify any training results

### **Rollback Capability**
- All old prompts stored in history
- Can revert to any previous version
- Training doesn't delete old data

### **Confidence Scoring**
- Low confidence lessons flagged
- You can ignore uncertain patterns
- Only high-confidence changes applied

---

## 🎉 Benefits

### **Time Savings**
- Agents improve automatically
- Less manual prompt engineering
- Fewer bad leads to review
- Better replies without rewriting

### **Continuous Improvement**
- Gets smarter every week
- Learns YOUR specific preferences
- Adapts to YOUR brand voice
- Improves with more data

### **Data-Driven**
- Based on real feedback
- Not guesswork or assumptions
- Measurable improvements
- Trackable metrics

---

## 🚧 Future Enhancements

### **Phase 2: Model Fine-Tuning**
- Collect 100+ feedback examples
- Fine-tune local AI models (llama3.1:8b)
- Replace prompt engineering with trained model
- Even better performance

### **Phase 3: A/B Testing**
- Test old vs new prompts
- Measure conversion improvements
- Auto-select best performing version

### **Phase 4: Real-Time Learning**
- Learn from every interaction
- Update prompts daily instead of weekly
- Faster adaptation

---

## 📞 Support

**Questions?**
- Check training dashboard: `/training`
- View training history
- Review lessons learned

**Issues?**
- Training not running: Check cron job logs
- No lessons: Need more feedback first
- Bad prompts: Can revert to previous version

---

## ✅ Status

**🎉 LIVE & READY!**

**Backend:** Deployed to Railway ✅  
**Frontend:** Deployed to Vercel ✅  
**Database:** Migration ready (run manually) ✅  
**Cron Job:** Active (next run: Monday 6 AM MDT) ✅  

**First Training:** Next Monday or click "Run Training Now"

---

**Your agents are now learning machines! 🧠🚀**
