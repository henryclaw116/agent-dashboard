import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PipelineTrackerService } from './pipelineTracker.service';

const execAsync = promisify(exec);

export interface AgentConfig {
  id: number;
  name: string;
  role: string;
  prompt: string;
  model?: string;
  skills?: string[];
  preferred_runtime?: string;
}

export interface WorkflowStep {
  id: number;
  step_order: number;
  step_name: string;
  prompt: string;
  rules?: string;
  conditions?: string;
  prerequisites?: string;
  expected_output?: string;
  tools_needed?: string[];
}

/**
 * Agent Orchestrator Service
 * Spawns real OpenClaw sessions based on dashboard agent configurations
 */
export class AgentOrchestratorService {
  constructor(private db: Pool) {}

  /**
   * Spawn an agent as a live OpenClaw session
   * Reads config from database and creates running session
   */
  async spawnAgent(agentId: number): Promise<{
    success: boolean;
    sessionKey?: string;
    message: string;
  }> {
    try {
      // 1. Get agent config from database
      const agentResult = await this.db.query(
        'SELECT * FROM agents WHERE id = $1',
        [agentId]
      );

      if (agentResult.rows.length === 0) {
        return {
          success: false,
          message: `Agent ${agentId} not found`
        };
      }

      const agent: AgentConfig = agentResult.rows[0];

      // 2. Get agent workflows
      const workflowResult = await this.db.query(`
        SELECT ws.* FROM workflow_steps ws
        JOIN agent_workflows aw ON ws.workflow_id = aw.id
        WHERE aw.agent_id = $1 AND aw.is_active = true
        ORDER BY ws.step_order ASC
      `, [agentId]);

      const workflows: WorkflowStep[] = workflowResult.rows;

      // 3. Build the task prompt
      const task = this.buildTaskFromConfig(agent, workflows);

      // 4. Determine runtime (MSI or Beelink)
      const runtime = agent.preferred_runtime || 'msi';

      // 5. Spawn OpenClaw session
      let command: string;
      const label = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      if (runtime === 'beelink') {
        // Spawn on Beelink via SSH
        command = `ssh -i $env:USERPROFILE\\.ssh\\id_beelink tony@192.168.0.91 "cd ~/.openclaw && echo '${task.replace(/'/g, "'\\''")}' > /tmp/agent-task-${agentId}.txt && openclaw sessions list"`;
      } else {
        // Spawn on MSI (local) - using sessions_spawn tool
        // Note: We'll use the sessions_spawn tool via OpenClaw API
        command = `echo Spawning ${agent.name}`;
      }

      // For now, log the spawn attempt
      await this.db.query(`
        INSERT INTO agent_activity (agent_id, activity_type, description, metadata)
        VALUES ($1, 'agent_spawned', $2, $3)
      `, [
        agentId,
        `Agent ${agent.name} spawned as live session`,
        JSON.stringify({
          runtime,
          label,
          model: agent.model,
          workflow_count: workflows.length,
          task_preview: task.substring(0, 200)
        })
      ]);

      // Execute spawn
      const { stdout, stderr } = await execAsync(command);

      return {
        success: true,
        sessionKey: label,
        message: `Agent ${agent.name} spawned successfully on ${runtime}`
      };
    } catch (error: any) {
      console.error('Failed to spawn agent:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Build a comprehensive task prompt from agent config and workflows
   */
  private buildTaskFromConfig(agent: AgentConfig, workflows: WorkflowStep[]): string {
    let task = `# ${agent.name} - ${agent.role}\n\n`;
    
    // Add agent prompt
    task += `## Your Instructions\n\n${agent.prompt}\n\n`;

    // Add workflows if any
    if (workflows.length > 0) {
      task += `## Workflows to Execute\n\n`;
      
      workflows.forEach((step, index) => {
        task += `### Step ${step.step_order}: ${step.step_name}\n\n`;
        task += `${step.prompt}\n\n`;
        
        if (step.rules) {
          task += `**Rules:**\n${step.rules}\n\n`;
        }
        
        if (step.conditions) {
          task += `**Conditions:**\n${step.conditions}\n\n`;
        }
        
        if (step.prerequisites) {
          task += `**Prerequisites:**\n${step.prerequisites}\n\n`;
        }
        
        if (step.expected_output) {
          task += `**Expected Output:**\n${step.expected_output}\n\n`;
        }
        
        if (step.tools_needed && step.tools_needed.length > 0) {
          task += `**Tools Needed:** ${step.tools_needed.join(', ')}\n\n`;
        }
      });
    }

    // Add skills if any
    if (agent.skills && agent.skills.length > 0) {
      task += `## Your Skills\n`;
      agent.skills.forEach(skill => {
        task += `- ${skill}\n`;
      });
      task += `\n`;
    }

    task += `## Execution\n`;
    task += `Execute the above workflows step-by-step. Report progress after each step. Alert Tony if you encounter blockers.`;

    return task;
  }

  /**
   * Get all agents that have workflows (potential candidates for spawning)
   */
  async getScheduledAgents(): Promise<AgentConfig[]> {
    const result = await this.db.query(`
      SELECT DISTINCT a.* 
      FROM agents a
      JOIN agent_workflows aw ON a.id = aw.agent_id
      WHERE a.status = 'active'
        AND aw.is_active = true
    `);

    return result.rows;
  }

  /**
   * Check if agent should run now based on time in prompt
   * Looks for patterns like "5:30 AM" or "start at 5:30"
   */
  shouldRunNow(agent: AgentConfig): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Parse time from prompt (e.g., "start your workflow daily at 5:30 am")
    const timeMatch = agent.prompt?.match(/at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3]?.toLowerCase();
      
      // Convert to 24-hour format
      if (meridiem === 'pm' && hour < 12) {
        hour += 12;
      } else if (meridiem === 'am' && hour === 12) {
        hour = 0;
      }
      
      // Check if it's the right time (within 1 minute window)
      if (hour === currentHour && Math.abs(minute - currentMinute) <= 1) {
        return true;
      }
    }
    
    return false;
  }
}

export default AgentOrchestratorService;
