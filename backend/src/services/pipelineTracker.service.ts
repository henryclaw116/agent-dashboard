import { Pool } from 'pg';

interface TaskProgress {
  taskId: number;
  progress: number;
  status: 'queued' | 'in_progress' | 'blocked' | 'completed' | 'failed';
  blockedReason?: string;
}

export class PipelineTrackerService {
  constructor(private db: Pool) {}

  /**
   * Create a new task in the pipeline
   */
  async createTask(params: {
    taskName: string;
    agentId?: number;
    agentName: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    expectedCompletion?: Date;
    isRecurring?: boolean;
    recurrencePattern?: string;
    metadata?: any;
  }): Promise<number> {
    const result = await this.db.query(`
      INSERT INTO task_execution (
        task_name,
        agent_id,
        agent_name,
        status,
        priority,
        expected_completion,
        is_recurring,
        recurrence_pattern,
        metadata
      ) VALUES ($1, $2, $3, 'queued', $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      params.taskName,
      params.agentId || null,
      params.agentName,
      params.priority || 'medium',
      params.expectedCompletion || null,
      params.isRecurring || false,
      params.recurrencePattern || null,
      params.metadata ? JSON.stringify(params.metadata) : null
    ]);

    return result.rows[0].id;
  }

  /**
   * Start a task (mark as in_progress)
   */
  async startTask(taskId: number): Promise<void> {
    await this.db.query(`
      UPDATE task_execution
      SET 
        status = 'in_progress',
        started_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [taskId]);

    console.log(`✅ Task ${taskId} started`);
  }

  /**
   * Update task progress
   */
  async updateProgress(taskId: number, progress: number): Promise<void> {
    await this.db.query(`
      UPDATE task_execution
      SET 
        progress_percent = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [progress, taskId]);
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: number, metadata?: any): Promise<void> {
    await this.db.query(`
      UPDATE task_execution
      SET 
        status = 'completed',
        progress_percent = 100,
        completed_at = NOW(),
        time_spent_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
        metadata = COALESCE($1, metadata),
        updated_at = NOW()
      WHERE id = $2
    `, [metadata ? JSON.stringify(metadata) : null, taskId]);

    console.log(`✅ Task ${taskId} completed`);
  }

  /**
   * Mark task as failed
   */
  async failTask(taskId: number, errorMessage: string): Promise<void> {
    await this.db.query(`
      UPDATE task_execution
      SET 
        status = 'failed',
        error_message = $1,
        completed_at = NOW(),
        time_spent_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
        updated_at = NOW()
      WHERE id = $2
    `, [errorMessage, taskId]);

    console.log(`❌ Task ${taskId} failed: ${errorMessage}`);
  }

  /**
   * Block a task
   */
  async blockTask(taskId: number, reason: string): Promise<void> {
    await this.db.query(`
      UPDATE task_execution
      SET 
        status = 'blocked',
        blocked_reason = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [reason, taskId]);

    console.log(`⏸️ Task ${taskId} blocked: ${reason}`);
  }

  /**
   * Update agent health and status
   */
  async updateAgentStatus(params: {
    agentId: number;
    agentName: string;
    status: 'online' | 'offline' | 'busy' | 'idle' | 'error';
    currentTaskId?: number;
    healthScore?: number;
  }): Promise<void> {
    await this.db.query(`
      INSERT INTO agent_status (
        agent_id,
        agent_name,
        status,
        current_task_id,
        last_heartbeat,
        last_activity,
        health_score,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, NOW())
      ON CONFLICT (agent_id) DO UPDATE SET
        status = $3,
        current_task_id = $4,
        last_heartbeat = NOW(),
        last_activity = NOW(),
        health_score = COALESCE($5, agent_status.health_score),
        updated_at = NOW()
    `, [
      params.agentId,
      params.agentName,
      params.status,
      params.currentTaskId || null,
      params.healthScore || 100
    ]);

    console.log(`📊 Agent ${params.agentName} status: ${params.status}`);
  }

  /**
   * Mark agent as offline (missed heartbeat)
   */
  async markAgentOffline(agentId: number): Promise<void> {
    await this.db.query(`
      UPDATE agent_status
      SET 
        status = 'offline',
        consecutive_errors = consecutive_errors + 1,
        health_score = GREATEST(health_score - 10, 0),
        updated_at = NOW()
      WHERE agent_id = $1
    `, [agentId]);

    console.log(`⚠️ Agent ${agentId} marked offline`);
  }

  /**
   * Track recurring task execution
   */
  async trackRecurringTask(params: {
    taskName: string;
    agentName: string;
    recurrencePattern: string;
  }): Promise<number> {
    return this.createTask({
      ...params,
      isRecurring: true,
      priority: 'medium'
    });
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: number): Promise<any> {
    const result = await this.db.query(
      'SELECT * FROM task_execution WHERE id = $1',
      [taskId]
    );
    return result.rows[0];
  }

  /**
   * Get agent current task
   */
  async getAgentCurrentTask(agentId: number): Promise<any> {
    const result = await this.db.query(`
      SELECT te.* 
      FROM task_execution te
      JOIN agent_status ast ON te.id = ast.current_task_id
      WHERE ast.agent_id = $1
    `, [agentId]);
    
    return result.rows[0];
  }

  /**
   * Clean up old completed/failed tasks (keep last 7 days)
   */
  async cleanupOldTasks(): Promise<void> {
    await this.db.query(`
      DELETE FROM task_execution
      WHERE status IN ('completed', 'failed')
      AND completed_at < NOW() - INTERVAL '7 days'
    `);

    console.log('🧹 Cleaned up old tasks');
  }
}
