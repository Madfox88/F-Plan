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
  due_date: string | null;
  created_at: string;
};

export type Stage = {
  id: string;
  plan_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
  completed?: boolean;
};

export type Task = {
  id: string;
  stage_id: string;
  title: string;
  completed: boolean;
  status?: 'not_started' | 'in_progress' | 'completed';
  priority?: 'urgent' | 'important' | 'medium' | 'low';
  start_date?: string | null;
  due_date: string | null;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'customized';
  description?: string | null;
  checklists?: ChecklistItem[] | null;
  labels?: Array<{ id: string; name: string; color: string }> | null;
  created_at: string;
  // Dynamic fields added for grouping display
  stage_name?: string;
};

export type GoalTagColor = 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple';

export type GoalTag = {
  label: string;
  color: GoalTagColor;
};

export type Goal = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  tags: GoalTag[];
  created_at: string;
};

export type PlanGoal = {
  plan_id: string;
  goal_id: string;
};

/* Calendar-native types (CALENDAR_RULES.md §10) */

export type RepeatRule =
  | 'none'
  | 'daily'
  | 'bi_daily'
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'bi_monthly'
  | 'yearly'
  | 'bi_yearly';

export type CalendarEvent = {
  id: string;
  workspace_id: string;
  title: string;
  notes: string | null;
  location: string | null;
  start_at: string; // ISO timestamptz
  end_at: string;   // ISO timestamptz
  repeat_rule: RepeatRule;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  workspace_id: string;
  title: string;
  notes: string | null;
  remind_at: string; // ISO timestamptz
  repeat_rule: RepeatRule;
  created_at: string;
  updated_at: string;
};

/* Extended types for API responses with relations */
export type PlanWithRelations = Plan & {
  stages?: Stage[];
  goals?: Goal[];
};

export type StageWithTasks = Stage & {
  tasks?: Task[];
};
