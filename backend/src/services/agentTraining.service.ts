import { Pool } from 'pg';
import OpenAI from 'openai';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TrainingLesson {
  category: string;
  lesson: string;
  examples: string[];
  confidence: number;
}

interface AgentPromptUpdate {
  agent_name: string;
  current_prompt: string;
  suggested_prompt: string;
  lessons_applied: TrainingLesson[];
  improvement_areas: string[];
}

/**
 * Agent Training Service
 * 
 * Analyzes feedback from users and automatically improves agent prompts.
 * Runs weekly or on-demand to make agents smarter over time.
 */
export class AgentTrainingService {
  
  /**
   * Analyze reply writing feedback and extract lessons
   */
  async analyzeReplyFeedback(since: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)): Promise<TrainingLesson[]> {
    const result = await pool.query(`
      SELECT 
        feedback_text,
        original_reply,
        improved_reply,
        created_at
      FROM training_feedback
      WHERE created_at >= $1
      ORDER BY created_at DESC
    `, [since]);

    if (result.rows.length === 0) {
      return [];
    }

    // Use GPT-4 to analyze patterns in feedback
    const feedbackSummary = result.rows.map(row => `
Feedback: ${row.feedback_text}
Original: ${row.original_reply}
Improved: ${row.improved_reply}
    `).join('\n---\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `You are an AI training analyst. Analyze user feedback about reply messages and extract actionable lessons.

Focus on:
- Tone preferences (formal vs casual)
- Length preferences (concise vs detailed)
- Content preferences (what to include/exclude)
- Common mistakes to avoid
- Successful patterns to replicate

Return JSON array of lessons with format:
{
  "lessons": [
    {
      "category": "tone|length|content|avoid|pattern",
      "lesson": "Specific actionable lesson",
      "examples": ["example 1", "example 2"],
      "confidence": 0.0-1.0
    }
  ]
}`
      }, {
        role: 'user',
        content: `Analyze these ${result.rows.length} feedback examples and extract key lessons:\n\n${feedbackSummary}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{"lessons":[]}');
    return analysis.lessons || [];
  }

  /**
   * Analyze lead quality feedback and extract lessons
   */
  async analyzeLeadQualityFeedback(since: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)): Promise<TrainingLesson[]> {
    const result = await pool.query(`
      SELECT 
        feedback_text,
        lead_score,
        pain_category,
        selected_landing_page,
        platform,
        final_status,
        created_at
      FROM lead_quality_training
      WHERE created_at >= $1
      ORDER BY created_at DESC
    `, [since]);

    if (result.rows.length === 0) {
      return [];
    }

    const feedbackSummary = result.rows.map(row => `
Feedback: ${row.feedback_text}
Score: ${row.lead_score}
Pain: ${row.pain_category}
Landing Page: ${row.selected_landing_page}
Final Status: ${row.final_status}
    `).join('\n---\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `You are an AI training analyst. Analyze user feedback about lead quality and extract actionable lessons.

Focus on:
- Scoring accuracy (too high/low patterns)
- Pain point relevance (what matters vs doesn't)
- Landing page selection (which pages for which pain points)
- Quality indicators (what makes a good vs bad lead)
- Platform-specific patterns

Return JSON array of lessons with format:
{
  "lessons": [
    {
      "category": "scoring|pain_detection|routing|quality|platform",
      "lesson": "Specific actionable lesson",
      "examples": ["example 1", "example 2"],
      "confidence": 0.0-1.0
    }
  ]
}`
      }, {
        role: 'user',
        content: `Analyze these ${result.rows.length} feedback examples and extract key lessons:\n\n${feedbackSummary}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{"lessons":[]}');
    return analysis.lessons || [];
  }

  /**
   * Generate improved prompt for Writer Agent based on lessons
   */
  async generateWriterPrompt(lessons: TrainingLesson[]): Promise<string> {
    const currentPrompt = `You are a helpful social media assistant for Real Life Trading (RLT), a credit spread trading education company.

Brand voice guidelines:
- Warm, authentic, and supportive tone
- Never make income claims or guarantees
- Never use fake urgency or hype
- Focus on education and process over results
- Target: middle-class professionals seeking supplemental income
- Avoid day-trading get-rich-quick language

Your goal is to help frustrated traders by pointing them to relevant free RLT resources on YouTube.`;

    const lessonsText = lessons.map(l => `- ${l.category}: ${l.lesson}`).join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: 'You are an AI prompt engineer. Improve agent prompts by incorporating user feedback lessons while maintaining core brand values.'
      }, {
        role: 'user',
        content: `Current Writer Agent prompt:
${currentPrompt}

User feedback lessons learned:
${lessonsText}

Generate an improved prompt that incorporates these lessons while maintaining RLT brand values. Keep it concise and actionable.`
      }],
      temperature: 0.3
    });

    return completion.choices[0].message.content || currentPrompt;
  }

  /**
   * Generate improved scoring guidelines for Scorer Agent
   */
  async generateScorerGuidelines(lessons: TrainingLesson[]): Promise<string> {
    const currentGuidelines = `Score leads 0-100 based on:
- Pain point clarity (30 points)
- Motivation level (25 points)  
- Experience level (20 points)
- Red flags check (15 points)
- Platform quality (10 points)

70+ = High quality, route to Writer
50-69 = Medium quality, consider
<50 = Low quality, reject`;

    const lessonsText = lessons
      .filter(l => l.category === 'scoring' || l.category === 'quality')
      .map(l => `- ${l.lesson}`)
      .join('\n');

    if (!lessonsText) return currentGuidelines;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: 'You are an AI prompt engineer. Improve lead scoring guidelines based on user feedback about scoring accuracy.'
      }, {
        role: 'user',
        content: `Current scoring guidelines:
${currentGuidelines}

User feedback about scoring:
${lessonsText}

Generate improved scoring guidelines that fix these issues. Be specific and actionable.`
      }],
      temperature: 0.3
    });

    return completion.choices[0].message.content || currentGuidelines;
  }

  /**
   * Generate improved routing rules for Router Agent
   */
  async generateRouterRules(lessons: TrainingLesson[]): Promise<string> {
    const currentRules = `Route to landing pages based on pain point:

- "losing money" / "consistent losses" → Consistency Course
- "small account" / "$200 account" → $200 Strategy Challenge  
- "new to options" / "beginner" → Options Basics
- "credit spreads" / "strategy" → Credit Spreads Guide
- "general interest" / "want to learn" → Free Trial
- "supplemental income" / "replace job" → Income Guide`;

    const lessonsText = lessons
      .filter(l => l.category === 'routing')
      .map(l => `- ${l.lesson}`)
      .join('\n');

    if (!lessonsText) return currentRules;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: 'You are an AI prompt engineer. Improve landing page routing rules based on user feedback about routing decisions.'
      }, {
        role: 'user',
        content: `Current routing rules:
${currentRules}

User feedback about routing:
${lessonsText}

Generate improved routing rules that fix these issues. Be specific about pain point → landing page mappings.`
      }],
      temperature: 0.3
    });

    return completion.choices[0].message.content || currentRules;
  }

  /**
   * Save training results to database
   */
  async saveTrainingResults(results: {
    writer_prompt?: string;
    scorer_guidelines?: string;
    router_rules?: string;
    reply_lessons: TrainingLesson[];
    quality_lessons: TrainingLesson[];
    training_date: Date;
  }) {
    await pool.query(`
      INSERT INTO agent_training_history (
        writer_prompt,
        scorer_guidelines,
        router_rules,
        reply_lessons_json,
        quality_lessons_json,
        training_date,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      results.writer_prompt,
      results.scorer_guidelines,
      results.router_rules,
      JSON.stringify(results.reply_lessons),
      JSON.stringify(results.quality_lessons),
      results.training_date
    ]);
  }

  /**
   * Run full training cycle
   */
  async runTrainingCycle(): Promise<AgentPromptUpdate[]> {
    console.log('🎓 Starting automated agent training cycle...');

    // Analyze feedback from last 7 days
    const [replyLessons, qualityLessons] = await Promise.all([
      this.analyzeReplyFeedback(),
      this.analyzeLeadQualityFeedback()
    ]);

    console.log(`📚 Found ${replyLessons.length} reply lessons, ${qualityLessons.length} quality lessons`);

    if (replyLessons.length === 0 && qualityLessons.length === 0) {
      console.log('⏭️ No new lessons to learn. Skipping training.');
      return [];
    }

    // Generate improved prompts
    const [writerPrompt, scorerGuidelines, routerRules] = await Promise.all([
      replyLessons.length > 0 ? this.generateWriterPrompt(replyLessons) : Promise.resolve(null),
      qualityLessons.filter(l => l.category === 'scoring' || l.category === 'quality').length > 0 
        ? this.generateScorerGuidelines(qualityLessons) 
        : Promise.resolve(null),
      qualityLessons.filter(l => l.category === 'routing').length > 0
        ? this.generateRouterRules(qualityLessons)
        : Promise.resolve(null)
    ]);

    // Save results
    await this.saveTrainingResults({
      writer_prompt: writerPrompt || undefined,
      scorer_guidelines: scorerGuidelines || undefined,
      router_rules: routerRules || undefined,
      reply_lessons: replyLessons,
      quality_lessons: qualityLessons,
      training_date: new Date()
    });

    console.log('✅ Training cycle complete!');

    const updates: AgentPromptUpdate[] = [];

    if (writerPrompt) {
      updates.push({
        agent_name: 'Writer Agent',
        current_prompt: 'See database for current prompt',
        suggested_prompt: writerPrompt,
        lessons_applied: replyLessons,
        improvement_areas: replyLessons.map(l => l.category)
      });
    }

    if (scorerGuidelines) {
      updates.push({
        agent_name: 'Scorer Agent',
        current_prompt: 'See database for current guidelines',
        suggested_prompt: scorerGuidelines,
        lessons_applied: qualityLessons.filter(l => l.category === 'scoring' || l.category === 'quality'),
        improvement_areas: ['scoring', 'quality']
      });
    }

    if (routerRules) {
      updates.push({
        agent_name: 'Router Agent',
        current_prompt: 'See database for current rules',
        suggested_prompt: routerRules,
        lessons_applied: qualityLessons.filter(l => l.category === 'routing'),
        improvement_areas: ['routing']
      });
    }

    return updates;
  }

  /**
   * Get training history
   */
  async getTrainingHistory(limit: number = 10) {
    const result = await pool.query(`
      SELECT 
        id,
        writer_prompt,
        scorer_guidelines,
        router_rules,
        reply_lessons_json,
        quality_lessons_json,
        training_date,
        created_at
      FROM agent_training_history
      ORDER BY training_date DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      id: row.id,
      writer_prompt: row.writer_prompt,
      scorer_guidelines: row.scorer_guidelines,
      router_rules: row.router_rules,
      reply_lessons: JSON.parse(row.reply_lessons_json || '[]'),
      quality_lessons: JSON.parse(row.quality_lessons_json || '[]'),
      training_date: row.training_date,
      created_at: row.created_at
    }));
  }

  /**
   * Get latest prompts for agents
   */
  async getLatestPrompts() {
    const result = await pool.query(`
      SELECT 
        writer_prompt,
        scorer_guidelines,
        router_rules,
        training_date
      FROM agent_training_history
      ORDER BY training_date DESC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }
}

export const agentTrainingService = new AgentTrainingService();
