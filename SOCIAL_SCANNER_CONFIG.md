# Social Media Scanner Configuration

## Purpose
24/7 monitoring of social media platforms to identify ideal RLT customers who are:
- Frustrated with current trading results
- Looking for education (not get-rich-quick schemes)
- Asking about options/credit spreads
- Open to learning structured trading approaches

## AI-Powered Lead Qualification

### Ollama Models Used

**1. llama3.1:8b** - Primary intent classifier
- Determines if post is a genuine question vs. spam/promotion
- Scores intent from 0-100
- Fast inference (~50 tokens/sec on RTX 3090)

**2. mistral:7b** - Sentiment and context analysis
- Identifies frustration, confusion, or genuine curiosity
- Detects scam victims or people burned by bad "gurus"
- Flags red flags (unrealistic expectations, pump-and-dump talk)

**3. nomic-embed-text** - Semantic similarity
- Compare posts to "ideal customer" embeddings
- Find posts similar to past successful conversions
- Cluster similar questions for batch responses

### Lead Scoring Algorithm (0-100)

**High Score Indicators (+points):**
- ✅ Asks specific options trading questions (+25)
- ✅ Mentions credit spreads or theta strategies (+30)
- ✅ Expresses frustration with current results (+20)
- ✅ Uses terms like "learning", "education", "guidance" (+15)
- ✅ Has realistic expectations (+10)
- ✅ Post is recent (< 24 hours) (+10)
- ✅ Active participant in trading communities (+10)

**Low Score Indicators (-points):**
- ❌ Promoting competing services (-50)
- ❌ Get-rich-quick mindset (-40)
- ❌ Asking for "hot tips" or "sure things" (-30)
- ❌ Negative sentiment about paying for education (-25)
- ❌ Recently posted by same user (< 7 days) (-20)
- ❌ Spam keywords detected (-100)

**Example Prompt for Lead Scoring:**
```
Analyze this post and score 0-100 for RLT lead quality.

Post: "{post_content}"
Author: {username}
Context: {subreddit/hashtag}

RLT Ideal Customer:
- Wants to learn credit spreads for income
- Willing to invest time in education
- Frustrated with current trading or job situation
- Looking for structured approach, not gambling
- Middle-class professional (30-55 years old typical)

Score based on:
1. Intent clarity (question vs. rant vs. spam)
2. Alignment with RLT values (education, process, safety)
3. Likelihood of converting to trial member
4. Recency and engagement level

Return JSON:
{
  "score": 0-100,
  "reason": "brief explanation",
  "red_flags": ["list any concerns"],
  "suggested_response": "draft reply if score > 60"
}
```

## Platforms Monitored

### Reddit (Primary)
**Subreddits:**
- r/options (750K members) - Every 15 minutes
- r/thetagang (180K members) - Every 15 minutes
- r/investing (2.3M members) - Every 30 minutes
- r/stocks (5.6M members) - Every 30 minutes
- r/wallstreetbets (15M members) - Filter carefully, high noise
- r/personalfinance (18M members) - Weekly scans for career/income posts

**Keywords:**
- "credit spread"
- "selling options"
- "theta decay"
- "options education"
- "learning to trade"
- "income from trading"
- "frustrated with"
- "lost money trading"

### Twitter/X
**Hashtags:**
- #OptionsTrading
- #CreditSpreads
- #ThetaGang
- #OptionsEducation
- #LearnToTrade

**Follow & Monitor:**
- Replies to popular trading educators
- Mentions of "credit spread" or "options education"
- Quote tweets asking for advice

### YouTube Comments
**Channels to Monitor:**
- Competitor channels (Options Alpha, tastytrade, etc.)
- General finance channels when they post options content
- Comments asking "where to learn more"

**Triggers:**
- Questions in comments
- Expressions of confusion
- Requests for education

### Facebook Groups (if accessible)
- Options Trading groups
- Trading education communities
- Filter by posts asking questions

## Scanning Schedule

### High-Priority Scans (Every 15 min)
- Reddit r/options - new posts
- Reddit r/thetagang - new posts
- Twitter hashtag #CreditSpreads

### Medium-Priority Scans (Every 30 min)
- Reddit r/investing - new posts
- Reddit r/stocks - keyword search
- YouTube comments on recent videos

### Low-Priority Scans (Hourly)
- Reddit r/wallstreetbets - filtered keywords
- Twitter #OptionsTrading (high volume)
- Facebook groups

### Weekly Deep Scans
- Historical posts we might have missed
- Engagement tracking on our past responses
- Trend analysis (what topics are hot?)

## Data Storage

### Database Schema (Supabase)

**Table: `social_leads`**
```sql
CREATE TABLE social_leads (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    platform_id VARCHAR(255) UNIQUE NOT NULL,
    author_username VARCHAR(255),
    author_url TEXT,
    post_content TEXT NOT NULL,
    post_url TEXT NOT NULL,
    post_timestamp TIMESTAMP,
    discovered_at TIMESTAMP DEFAULT NOW(),
    
    -- AI Scoring
    lead_score INTEGER, -- 0-100
    intent_score INTEGER,
    sentiment_score INTEGER,
    ai_analysis JSONB, -- Full AI response
    
    -- Classification
    category VARCHAR(50), -- 'trading_question', 'frustrated', 'educational', etc.
    red_flags TEXT[],
    
    -- Response Tracking
    draft_response TEXT,
    response_sent BOOLEAN DEFAULT FALSE,
    response_sent_at TIMESTAMP,
    replied_by VARCHAR(100),
    
    -- Engagement
    engagement_score INTEGER, -- upvotes, likes, etc.
    has_follow_up BOOLEAN DEFAULT FALSE,
    converted_to_trial BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lead_score ON social_leads(lead_score DESC);
CREATE INDEX idx_platform ON social_leads(platform);
CREATE INDEX idx_discovered_at ON social_leads(discovered_at DESC);
CREATE INDEX idx_response_sent ON social_leads(response_sent);
```

## Response Strategy

### When to Respond
**Auto-approve for reply (score > 80):**
- Direct question about credit spreads
- Asking for educational resources
- Expressing genuine frustration with trading

**Draft for review (score 60-80):**
- Good fit but needs context
- Might be competitor research
- Sensitive topic (losses, career change)

**Archive (score < 60):**
- Low intent or spam
- Not aligned with RLT values
- Too recent (already replied to this user)

### Response Templates

**Educational Resource:**
```
Hey! Great question about [specific topic]. I learned a ton from Real Life Trading on YouTube - Tony breaks down [topic] really clearly in this video: [YT link]

No fluff, just solid education. Check it out!
```

**Empathy + Resource:**
```
Been there. [Topic] can be frustrating when you don't have a structured approach.

This video helped me a lot: [YT link]

The key is [1-2 sentence insight from video]. Hope it helps!
```

**Community Invitation:**
```
RLT has a great community for learning [topic]. They do a live $200 Strategy Challenge every Monday where Tony walks through real trades.

Not trying to sell anything - just sharing what worked for me. Check out their YouTube if interested.
```

### Response Guidelines
- ✅ Always lead with value (YouTube video, blog post, free resource)
- ✅ Be conversational and authentic
- ✅ Share personal experience when relevant
- ✅ Never hard-sell or mention pricing
- ✅ Focus on education and process
- ❌ Never make income claims
- ❌ Never guarantee results
- ❌ Avoid appearing desperate or salesy

## Daily Workflow

### Morning Summary (6:00 AM)
```
📊 SOCIAL SCANNER - Daily Summary

New Leads: 47
- High Priority (score 80+): 8
- Review Needed (score 60-80): 15
- Archived (score <60): 24

Top Lead:
- Platform: Reddit r/options
- Author: u/confused_trader_22
- Score: 92
- Post: "Been trading spreads for 6 months but keep getting assigned early. Where did I go wrong?"
- Suggested Reply: [draft]

Action Items:
- Review 8 high-priority leads
- Approve/edit responses
- Monitor engagement on yesterday's replies
```

### Real-Time Alerts (> 90 score)
```
🚨 HOT LEAD DETECTED

Platform: Reddit
Score: 94
Author: u/frustrated_eng
Post: "Just lost $5K on WSB plays. Ready to learn proper options strategies. Where should I start?"
URL: [link]

Suggested Reply:
"Hey, sorry to hear that. I was in a similar spot last year. 

Real Life Trading on YouTube has solid credit spread education - not the WSB gambling approach. Start here: [YT link]

The Monday $200 Strategy Challenge is where it clicked for me. Tony walks through live trades with risk management.

Good luck!"

[Approve] [Edit] [Archive]
```

## Monitoring & Metrics

### Pipeline Dashboard Integration
Track in real-time:
- Scans completed (every 15 min task)
- Leads discovered
- High-priority leads pending review
- Responses sent
- Engagement rate (upvotes, replies)

### Weekly Performance Report
```
📈 Social Scanner - Week of [date]

Leads Discovered: 312
High Priority: 45 (14%)
Responses Sent: 38
Conversions to YouTube: ~15-20 (estimated)
Conversions to Trial: TBD (track via UTM params)

Top Platforms:
1. Reddit r/options - 127 leads
2. Twitter #CreditSpreads - 89 leads
3. YouTube comments - 56 leads

Top Topics:
1. Credit spread questions (32%)
2. Getting started education (28%)
3. Trading mistakes/losses (22%)

Recommended Focus:
- Credit spread education content
- Beginner-friendly videos
- Risk management resources
```

## Privacy & Compliance

### What We DON'T Do:
- ❌ Scrape private messages
- ❌ Save personal email addresses (unless publicly shared)
- ❌ Track users across platforms
- ❌ Spam or mass-message

### What We DO:
- ✅ Monitor public posts only
- ✅ Respect platform ToS
- ✅ Genuine, helpful responses only
- ✅ Disclose affiliation when asked
- ✅ Rate-limit responses (max 10/day per platform)

## Cost Estimates

### Infrastructure:
- Tower power: ~$50-70/month
- Supabase (database): $0 (free tier sufficient)
- API costs: $0 (all scraping via public endpoints)

### Time Savings:
- Manual monitoring: ~4 hours/day
- Scanner automation: ~15 minutes/day (review high-priority leads)
- **Time saved: ~25 hours/week = $1000+/month in Tony's time**

### Expected ROI:
- Conservative: 2-3 trial signups/month = $550-825/month revenue
- Realistic: 5-10 trial signups/month = $1375-2750/month revenue
- **Break-even: 1 paid member = worth entire setup cost**

---

**Ready to deploy when tower is online!** 🚀
