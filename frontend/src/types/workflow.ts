export interface Workflow {
  id: number;
  agent_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  step_count?: number;
}

export interface WorkflowStep {
  id: number;
  workflow_id: number;
  step_order: number;
  step_name: string;
  prompt: string;
  rules: string | null;
  conditions: string | null;
  prerequisites: string | null;
  expected_output: string | null;
  tools_needed: string[] | null;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowWithSteps {
  workflow: Workflow;
  steps: WorkflowStep[];
}
