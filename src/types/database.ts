/* F-Plan Database Types (from DATABASE_SCHEMA.md) */

/* ── Users (DATABASE_SCHEMA.md §3) ── */
export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  created_at: string;
};

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member';

export type WorkspaceMember = {
  user_id: string;
  workspace_id: string;
  role: WorkspaceMemberRole;
  created_at: string;
};

export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  invited_by: string;
  status: InvitationStatus;
  created_at: string;
};

export type Plan = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  intent: string | null;
  status: 'active' | 'completed' | 'archived' | 'draft';
  is_pinned: boolean;
  is_inbox: boolean;            // hidden inbox plan for standalone tasks
  due_date: string | null;
  archived_at: string | null;   // PLAN_ARCHIVAL_TRUTH_RULES.md §2 — sole archival truth
  completed_at: string | null;  // set when user confirms plan completion prompt
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

/**
 * Task repeat cadence — subset used for recurring tasks.
 * Distinct from RepeatRule (calendar) which has bi_daily, bi_weekly, etc.
 */
export type TaskRepeatRule =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'customized';

export type Task = {
  id: string;
  stage_id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;  // TASK_TEMPORAL_TRUTH_RULES.md §2 — sole temporal authority
  assigned_to: string;          // TASK_OWNERSHIP_RULES.md §3 — FK → users.id  (DB: NOT NULL)
  status: 'not_started' | 'in_progress' | 'completed' | null;
  priority: 'urgent' | 'important' | 'medium' | 'low' | null;
  start_date: string | null;
  due_date: string | null;
  repeat: TaskRepeatRule | null;
  description: string | null;
  checklists: ChecklistItem[] | null;
  labels: Array<{ id: string; name: string; color: string }> | null;
  created_at: string;
};

/**
 * Task with the stage title attached — UI-only extension
 * used when tasks are displayed outside their stage context.
 */
export type TaskWithStageName = Task & { stage_name: string };

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
  completed_at: string | null;  // set when user manually marks goal as completed
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
  user_id: string | null;       // VISIBILITY_RULES.md §7.3 — personal ownership
  title: string;
  notes: string | null;
  remind_at: string; // ISO timestamptz
  repeat_rule: RepeatRule;
  created_at: string;
  updated_at: string;
};

/* Focus Sessions (FOCUS_SESSIONS_RULES.md §11) */

export type FocusSession = {
  id: string;
  user_id: string;
  workspace_id: string;
  started_at: string;
  ended_at: string | null;       // null while session is active
  duration_minutes: number | null; // derived on end
  planned_duration_minutes: number | null; // user-chosen target duration
  task_id: string | null;         // optional context
  plan_id: string | null;         // optional context
  goal_id: string | null;         // optional context
  created_at: string;
};

/* Extended types for API responses with relations */
export type PlanWithRelations = Plan & {
  stages?: Stage[];
  goals?: Goal[];
};

export type StageWithTasks = Stage & {
  tasks?: Task[];
};
