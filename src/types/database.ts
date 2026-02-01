/* F-Plan Database Types (from DATABASE_SCHEMA.md) */

export type Workspace = {
  id: string;
  name: string;
  created_at: string;
};

export type Plan = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  intent: string | null;
  status: 'active' | 'archived' | 'draft';
  is_pinned: boolean;
  created_at: string;
};

export type Stage = {
  id: string;
  plan_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type Task = {
  id: string;
  stage_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type PlanGoal = {
  plan_id: string;
  goal_id: string;
};

/* Extended types for API responses with relations */
export type PlanWithRelations = Plan & {
  stages?: Stage[];
  goals?: Goal[];
};

export type StageWithTasks = Stage & {
  tasks?: Task[];
};
