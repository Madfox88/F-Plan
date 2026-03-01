/**
 * F-Plan — Seed Script
 *
 * Inserts realistic test data across all tables.
 * Every seeded record includes `SEED_DATA_v1` in its metadata/notes
 * so the cleanup script can surgically remove it.
 *
 * Usage:  npx tsx scripts/seed.ts
 * Clean:  npx tsx scripts/clean-seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── Load .env manually (no Vite) ── */
function loadEnv() {
  const dir = resolve(__dirname, '..');
  const candidates = [resolve(dir, '.env.local'), resolve(dir, '.env')];
  let content: string | null = null;
  for (const p of candidates) {
    try { content = readFileSync(p, 'utf-8'); break; } catch { /* try next */ }
  }
  if (!content) { console.error('❌ Could not read .env.local or .env'); process.exit(1); }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = val;
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;
if (!url || !key) { console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'); process.exit(1); }

const supabase = createClient(url, key);

/** Marker so cleanup can find all seed records */
const SEED = 'SEED_DATA_v1';

/* ── Helpers ── */
function uuid() { return crypto.randomUUID(); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }
function hoursFromNow(n: number) { const d = new Date(); d.setHours(d.getHours() + n); return d.toISOString(); }
function dateOnly(iso: string) { return iso.slice(0, 10); }

async function getCurrentUser() {
  // Try CLI args:  npx tsx scripts/seed.ts email password
  const email = process.argv[2];
  const password = process.argv[3];
  if (email && password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { console.error('❌ Auth failed:', error.message); process.exit(1); }
    return data.user;
  }
  // Fallback: check existing session
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

async function getWorkspace(userId: string) {
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  if (!data) return null;
  const { data: ws } = await supabase.from('workspaces').select('*').eq('id', data.workspace_id).single();
  return ws;
}

/* ════════════════════════════════════════════════════════
   Main seed
   ════════════════════════════════════════════════════════ */
async function seed() {
  console.log('🌱 Seeding F-Plan database…\n');

  const user = await getCurrentUser();
  if (!user) { console.error('❌ Not authenticated. Log in to the app first so the session cookie is available.'); process.exit(1); }
  const userId = user.id;
  console.log(`  👤 User: ${user.email} (${userId})`);

  const workspace = await getWorkspace(userId);
  if (!workspace) { console.error('❌ No workspace found for this user.'); process.exit(1); }
  const wsId = workspace.id;
  console.log(`  🏢 Workspace: ${workspace.name} (${wsId})\n`);

  /* ── 1. Tags ── */
  const tagDefs = [
    { label: 'Health', color: 'green' },
    { label: 'Career', color: 'blue' },
    { label: 'Finance', color: 'orange' },
    { label: 'Learning', color: 'purple' },
    { label: 'Personal', color: 'neutral' },
    { label: 'Urgent', color: 'red' },
  ];

  const tagIds: string[] = [];
  for (const t of tagDefs) {
    const id = uuid();
    tagIds.push(id);
    await supabase.from('tags').insert([{ id, workspace_id: wsId, label: t.label, color: t.color }]);
  }
  console.log(`  🏷️  ${tagIds.length} tags created`);

  /* ── 2. Goals ── */
  const goalDefs = [
    { title: 'Run a Half Marathon', description: 'Complete a 21 km race by September.', due: dateOnly(daysFromNow(180)), tagIdx: [0] },
    { title: 'Launch Side Project', description: 'Ship v1.0 of the budgeting app.', due: dateOnly(daysFromNow(90)), tagIdx: [1, 3] },
    { title: 'Save $10,000 Emergency Fund', description: 'Build a 6-month safety net.', due: dateOnly(daysFromNow(365)), tagIdx: [2] },
    { title: 'Read 24 Books This Year', description: 'Two books per month — mix of fiction and non-fiction.', due: dateOnly(daysFromNow(300)), tagIdx: [3, 4] },
    { title: 'Get AWS Solutions Architect Cert', description: 'Pass the SAA-C03 exam.', due: dateOnly(daysFromNow(120)), tagIdx: [1, 3] },
  ];

  const goalIds: string[] = [];
  for (const g of goalDefs) {
    const id = uuid();
    goalIds.push(id);
    await supabase.from('goals').insert([{
      id, workspace_id: wsId, title: g.title, description: `${g.description}\n\n${SEED}`,
      due_date: g.due, tags: [],
    }]);
    // Link tags via junction table
    if (g.tagIdx.length) {
      await supabase.from('goal_tags').insert(g.tagIdx.map(i => ({ goal_id: id, tag_id: tagIds[i] })));
    }
  }
  console.log(`  🎯 ${goalIds.length} goals created`);

  /* ── 3. Plans ── */
  const planDefs = [
    { title: 'Marathon Training Plan', description: `16-week progressive running program.\n\n${SEED}`, status: 'active', goalIdx: [0], stages: ['Base Building', 'Speed Work', 'Peak Mileage', 'Taper'] },
    { title: 'Side Project — MVP', description: `Build and ship the budgeting app MVP.\n\n${SEED}`, status: 'active', goalIdx: [1], stages: ['Research', 'Design', 'Development', 'Testing', 'Launch'] },
    { title: 'AWS Cert Study Plan', description: `Structured study schedule for SAA-C03.\n\n${SEED}`, status: 'active', goalIdx: [4], stages: ['Fundamentals', 'Practice Labs', 'Mock Exams'] },
    { title: 'Q1 Reading List', description: `Books for Jan–Mar.\n\n${SEED}`, status: 'active', goalIdx: [3], stages: ['To Read', 'Reading', 'Finished'] },
    { title: 'Home Budget Overhaul', description: `Reorganise finances and automate savings.\n\n${SEED}`, status: 'completed', goalIdx: [2], stages: ['Audit', 'Plan', 'Execute'] },
  ];

  const planIds: string[] = [];
  const stageMap: Record<string, string[]> = {}; // planId → stageIds[]
  for (const p of planDefs) {
    const planId = uuid();
    planIds.push(planId);
    await supabase.from('plans').insert([{
      id: planId, workspace_id: wsId, title: p.title, description: p.description,
      status: p.status, is_pinned: false, is_inbox: false,
      completed_at: p.status === 'completed' ? daysAgo(5) : null,
    }]);

    // Link to goals
    for (const gi of p.goalIdx) {
      await supabase.from('plan_goals').insert([{ plan_id: planId, goal_id: goalIds[gi] }]);
    }

    // Create stages
    const sIds: string[] = [];
    for (let si = 0; si < p.stages.length; si++) {
      const sId = uuid();
      sIds.push(sId);
      await supabase.from('stages').insert([{ id: sId, plan_id: planId, title: p.stages[si], position: si }]);
    }
    stageMap[planId] = sIds;
  }
  console.log(`  📋 ${planIds.length} plans created (with stages)`);

  /* ── 4. Tasks ── */
  const taskDefs: Array<{
    title: string; stageRef: [number, number]; status: 'not_started' | 'in_progress' | 'completed';
    priority: 'urgent' | 'important' | 'medium' | 'low'; due?: string; description?: string;
    tagIdx?: number[];
  }> = [
    // Marathon plan (plan 0)
    { title: 'Buy running shoes', stageRef: [0, 0], status: 'completed', priority: 'important', description: `Get fitted at a running store.\n\n${SEED}` },
    { title: 'Run 5 km baseline test', stageRef: [0, 0], status: 'completed', priority: 'medium' },
    { title: 'Week 1 — 3 × 5 km easy', stageRef: [0, 0], status: 'in_progress', priority: 'medium', due: dateOnly(daysFromNow(3)) },
    { title: 'Interval session — 6 × 800 m', stageRef: [0, 1], status: 'not_started', priority: 'medium', due: dateOnly(daysFromNow(10)) },
    { title: 'Long run — 15 km', stageRef: [0, 2], status: 'not_started', priority: 'important', due: dateOnly(daysFromNow(30)) },

    // Side project (plan 1)
    { title: 'Competitive analysis doc', stageRef: [1, 0], status: 'completed', priority: 'medium', description: `Compare 5 budgeting apps.\n\n${SEED}` },
    { title: 'User interview notes', stageRef: [1, 0], status: 'completed', priority: 'medium' },
    { title: 'Wireframe dashboard', stageRef: [1, 1], status: 'completed', priority: 'important' },
    { title: 'Design component library', stageRef: [1, 1], status: 'in_progress', priority: 'important', due: dateOnly(daysFromNow(7)), tagIdx: [3] },
    { title: 'Set up repo & CI', stageRef: [1, 2], status: 'completed', priority: 'urgent' },
    { title: 'Build transaction list page', stageRef: [1, 2], status: 'in_progress', priority: 'important', due: dateOnly(daysFromNow(14)) },
    { title: 'Implement CSV import', stageRef: [1, 2], status: 'not_started', priority: 'medium', due: dateOnly(daysFromNow(21)) },
    { title: 'Write integration tests', stageRef: [1, 3], status: 'not_started', priority: 'medium', due: dateOnly(daysFromNow(28)) },
    { title: 'Deploy to Vercel', stageRef: [1, 4], status: 'not_started', priority: 'urgent', due: dateOnly(daysFromNow(35)) },

    // AWS cert (plan 2)
    { title: 'Watch VPC module', stageRef: [2, 0], status: 'completed', priority: 'medium', tagIdx: [3] },
    { title: 'Watch IAM & Security module', stageRef: [2, 0], status: 'in_progress', priority: 'medium' },
    { title: 'Complete S3 hands-on lab', stageRef: [2, 1], status: 'not_started', priority: 'important', due: dateOnly(daysFromNow(10)) },
    { title: 'Take practice exam 1', stageRef: [2, 2], status: 'not_started', priority: 'urgent', due: dateOnly(daysFromNow(30)) },

    // Reading (plan 3)
    { title: 'Atomic Habits — James Clear', stageRef: [3, 2], status: 'completed', priority: 'low' },
    { title: 'Deep Work — Cal Newport', stageRef: [3, 1], status: 'in_progress', priority: 'low' },
    { title: 'Designing Data-Intensive Apps', stageRef: [3, 0], status: 'not_started', priority: 'medium' },
    { title: 'The Pragmatic Programmer', stageRef: [3, 0], status: 'not_started', priority: 'medium' },

    // Budget (plan 4 — completed)
    { title: 'List all subscriptions', stageRef: [4, 0], status: 'completed', priority: 'medium' },
    { title: 'Cancel unused services', stageRef: [4, 1], status: 'completed', priority: 'important' },
    { title: 'Set up auto-transfer to savings', stageRef: [4, 2], status: 'completed', priority: 'urgent' },
  ];

  const taskIds: string[] = [];
  for (const t of taskDefs) {
    const id = uuid();
    taskIds.push(id);
    const stageId = stageMap[planIds[t.stageRef[0]]][t.stageRef[1]];
    const completed = t.status === 'completed';
    await supabase.from('tasks').insert([{
      id, stage_id: stageId, title: t.title, assigned_to: userId,
      completed, completed_at: completed ? daysAgo(Math.floor(Math.random() * 14) + 1) : null,
      status: t.status, priority: t.priority,
      due_date: t.due ?? null,
      description: t.description ?? `${SEED}`,
      checklists: [], labels: [],
    }]);

    // Link tags
    if (t.tagIdx?.length) {
      await supabase.from('task_tags').insert(t.tagIdx.map(i => ({ task_id: id, tag_id: tagIds[i] })));
    }
  }
  console.log(`  ✅ ${taskIds.length} tasks created`);

  /* ── 5. Calendar Events ── */
  const eventDefs = [
    { title: 'Team standup', notes: SEED, start: hoursFromNow(2), end: hoursFromNow(2.5), repeat: 'daily' },
    { title: 'Sprint planning', notes: SEED, start: daysFromNow(1), end: daysFromNow(1), repeat: 'bi_weekly' },
    { title: 'Dentist appointment', notes: SEED, start: daysFromNow(5), end: daysFromNow(5), repeat: 'none', location: '123 Main St' },
    { title: 'AWS study group', notes: SEED, start: daysFromNow(2), end: daysFromNow(2), repeat: 'weekly' },
    { title: 'Long run — Saturday', notes: SEED, start: daysFromNow(4), end: daysFromNow(4), repeat: 'weekly' },
    { title: 'Side project demo', notes: SEED, start: daysFromNow(14), end: daysFromNow(14), repeat: 'none' },
  ];

  for (const e of eventDefs) {
    await supabase.from('calendar_events').insert([{
      id: uuid(), workspace_id: wsId, title: e.title, notes: e.notes,
      location: (e as { location?: string }).location ?? null,
      start_at: e.start, end_at: e.end, repeat_rule: e.repeat,
    }]);
  }
  console.log(`  📅 ${eventDefs.length} calendar events created`);

  /* ── 6. Reminders ── */
  const reminderDefs = [
    { title: 'Renew gym membership', notes: SEED, remind_at: daysFromNow(3), repeat: 'none' },
    { title: 'Submit expense report', notes: SEED, remind_at: daysFromNow(1), repeat: 'monthly' },
    { title: 'Water the plants', notes: SEED, remind_at: hoursFromNow(4), repeat: 'bi_daily' },
    { title: 'Check savings balance', notes: SEED, remind_at: daysFromNow(7), repeat: 'monthly' },
  ];

  for (const r of reminderDefs) {
    await supabase.from('reminders').insert([{
      id: uuid(), workspace_id: wsId, user_id: userId,
      title: r.title, notes: r.notes, remind_at: r.remind_at, repeat_rule: r.repeat,
    }]);
  }
  console.log(`  🔔 ${reminderDefs.length} reminders created`);

  /* ── 7. Focus Sessions ── */
  const focusDefs = [
    { ago: 0.5, dur: 25, taskIdx: 2 },
    { ago: 1, dur: 50, taskIdx: 10 },
    { ago: 1.5, dur: 25, taskIdx: 15 },
    { ago: 2, dur: 25, taskIdx: 8 },
    { ago: 3, dur: 50, planIdx: 1 },
    { ago: 4, dur: 25, goalIdx: 0 },
    { ago: 5, dur: 25, taskIdx: 19 },
    { ago: 6, dur: 50, taskIdx: 5 },
    { ago: 7, dur: 25, planIdx: 2 },
    { ago: 10, dur: 25, taskIdx: 0 },
  ];

  for (const f of focusDefs) {
    const started = daysAgo(f.ago);
    const ended = new Date(new Date(started).getTime() + f.dur * 60000).toISOString();
    await supabase.from('focus_sessions').insert([{
      id: uuid(), user_id: userId, workspace_id: wsId,
      started_at: started, ended_at: ended, duration_minutes: f.dur,
      planned_duration_minutes: f.dur,
      task_id: f.taskIdx !== undefined ? taskIds[f.taskIdx] : null,
      plan_id: f.planIdx !== undefined ? planIds[f.planIdx] : null,
      goal_id: f.goalIdx !== undefined ? goalIds[f.goalIdx] : null,
    }]);
  }
  console.log(`  ⏱️  ${focusDefs.length} focus sessions created`);

  /* ── 8. Activity Log ── */
  const activityDefs: Array<{ action: string; entityType: string; entityId: string; entityTitle: string; ago: number }> = [
    { action: 'created', entityType: 'goal', entityId: goalIds[0], entityTitle: 'Run a Half Marathon', ago: 30 },
    { action: 'created', entityType: 'plan', entityId: planIds[0], entityTitle: 'Marathon Training Plan', ago: 30 },
    { action: 'created', entityType: 'goal', entityId: goalIds[1], entityTitle: 'Launch Side Project', ago: 25 },
    { action: 'created', entityType: 'plan', entityId: planIds[1], entityTitle: 'Side Project — MVP', ago: 25 },
    { action: 'completed', entityType: 'task', entityId: taskIds[0], entityTitle: 'Buy running shoes', ago: 20 },
    { action: 'completed', entityType: 'task', entityId: taskIds[1], entityTitle: 'Run 5 km baseline test', ago: 18 },
    { action: 'created', entityType: 'goal', entityId: goalIds[2], entityTitle: 'Save $10,000 Emergency Fund', ago: 15 },
    { action: 'completed', entityType: 'task', entityId: taskIds[5], entityTitle: 'Competitive analysis doc', ago: 14 },
    { action: 'completed', entityType: 'task', entityId: taskIds[6], entityTitle: 'User interview notes', ago: 12 },
    { action: 'completed', entityType: 'task', entityId: taskIds[7], entityTitle: 'Wireframe dashboard', ago: 10 },
    { action: 'edited', entityType: 'plan', entityId: planIds[1], entityTitle: 'Side Project — MVP', ago: 9 },
    { action: 'completed', entityType: 'task', entityId: taskIds[9], entityTitle: 'Set up repo & CI', ago: 8 },
    { action: 'created', entityType: 'goal', entityId: goalIds[4], entityTitle: 'Get AWS Solutions Architect Cert', ago: 7 },
    { action: 'created', entityType: 'plan', entityId: planIds[2], entityTitle: 'AWS Cert Study Plan', ago: 7 },
    { action: 'completed', entityType: 'task', entityId: taskIds[14], entityTitle: 'Watch VPC module', ago: 5 },
    { action: 'completed', entityType: 'plan', entityId: planIds[4], entityTitle: 'Home Budget Overhaul', ago: 5 },
    { action: 'completed', entityType: 'task', entityId: taskIds[18], entityTitle: 'Atomic Habits — James Clear', ago: 3 },
    { action: 'linked', entityType: 'goal', entityId: goalIds[1], entityTitle: 'Launch Side Project', ago: 2 },
    { action: 'edited', entityType: 'task', entityId: taskIds[10], entityTitle: 'Build transaction list page', ago: 1 },
    { action: 'created', entityType: 'tag', entityId: tagIds[5], entityTitle: 'Urgent', ago: 0.5 },
  ];

  for (const a of activityDefs) {
    const created = daysAgo(a.ago);
    await supabase.from('activity_log').insert([{
      id: uuid(), workspace_id: wsId, user_id: userId,
      action: a.action, entity_type: a.entityType,
      entity_id: a.entityId, entity_title: a.entityTitle,
      metadata: { seed: SEED }, created_at: created,
    }]);
  }
  console.log(`  📝 ${activityDefs.length} activity log entries created`);

  console.log('\n✅ Seed complete! Refresh the app to see your data.');
  console.log('   Run `npx tsx scripts/clean-seed.ts` to remove all seed data.\n');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
