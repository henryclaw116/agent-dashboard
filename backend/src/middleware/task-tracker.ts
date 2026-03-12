/**
 * Task Tracker Middleware
 * Automatically track agent tasks in orchestration system
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'https://backend-production-a8dd.up.railway.app';

interface TaskOptions {
  agent_id: number;
  task_name: string;
  task_payload?: any;
  priority?: number;
  tags?: string[];
}

export class TaskTracker {
  private currentTaskId: number | null = null;
  private agentId: number;

  constructor(agentId: number) {
    this.agentId = agentId;
  }

  /**
   * Start tracking a new task
   */
  async startTask(options: TaskOptions): Promise<number> {
    try {
      // Create task in orchestration system
      const response = await axios.post(`${API_BASE}/api/orchestration/tasks`, {
        task_name: options.task_name,
        task_type: 'auto',
        assigned_to_agent_id: options.agent_id,
        task_payload: options.task_payload || {},
        priority: options.priority || 5,
        tags: options.tags || []
      });

      const taskId = response.data.task.id;
      this.currentTaskId = taskId;

      // Mark as started
      await axios.post(`${API_BASE}/api/orchestration/tasks/${taskId}/start`);

      console.log(`✅ Task started: ${options.task_name} (ID: ${taskId})`);
      return taskId;
    } catch (error: any) {
      console.error('Failed to start task:', error.message);
      throw error;
    }
  }

  /**
   * Complete current task
   */
  async completeTask(result?: any): Promise<void> {
    if (!this.currentTaskId) {
      console.warn('No active task to complete');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/orchestration/tasks/${this.currentTaskId}/complete`, {
        result: result || { completed: true }
      });

      console.log(`✅ Task completed: ${this.currentTaskId}`);
      this.currentTaskId = null;
    } catch (error: any) {
      console.error('Failed to complete task:', error.message);
    }
  }

  /**
   * Fail current task
   */
  async failTask(errorMessage: string, retry: boolean = false): Promise<void> {
    if (!this.currentTaskId) {
      console.warn('No active task to fail');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/orchestration/tasks/${this.currentTaskId}/fail`, {
        error_message: errorMessage,
        retry
      });

      console.log(`❌ Task failed: ${this.currentTaskId} - ${errorMessage}`);
      this.currentTaskId = null;
    } catch (error: any) {
      console.error('Failed to mark task as failed:', error.message);
    }
  }

  /**
   * Get current task ID
   */
  getCurrentTaskId(): number | null {
    return this.currentTaskId;
  }

  /**
   * Send heartbeat with current task
   */
  async sendHeartbeat(options?: {
    status?: string;
    cpu_usage?: number;
    memory_usage_mb?: number;
    current_task?: string;
  }): Promise<void> {
    try {
      await axios.post(`${API_BASE}/api/orchestration/agents/${this.agentId}/heartbeat`, {
        status: options?.status || 'active',
        current_task: options?.current_task,
        cpu_usage: options?.cpu_usage,
        memory_usage_mb: options?.memory_usage_mb,
        healthy: true
      });
    } catch (error: any) {
      console.error('Failed to send heartbeat:', error.message);
    }
  }
}

/**
 * Helper function to wrap async work with task tracking
 */
export async function trackTask<T>(
  tracker: TaskTracker,
  taskName: string,
  work: () => Promise<T>,
  options?: {
    agentId: number;
    payload?: any;
    priority?: number;
    tags?: string[];
  }
): Promise<T> {
  let taskId: number | null = null;

  try {
    // Start task
    if (options) {
      taskId = await tracker.startTask({
        agent_id: options.agentId,
        task_name: taskName,
        task_payload: options.payload,
        priority: options.priority,
        tags: options.tags
      });
    }

    // Do work
    const result = await work();

    // Complete task
    await tracker.completeTask(result);

    return result;
  } catch (error: any) {
    // Fail task
    await tracker.failTask(error.message, true);
    throw error;
  }
}

export default TaskTracker;
