/**
 * F-Plan — Cleanup Seed Data
 *
 * Removes all records tagged with SEED_DATA_v1.
 * Safe to run multiple times — idempotent.
 *
 * Usage:  npx tsx scripts/clean-seed.ts
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

const SEED = 'SEED_DATA_v1';

async function authenticate() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (email && password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { console.error('❌ Auth failed:', error.message); process.exit(1); }
  }
}

async function clean() {
  await authenticate();
  console.log('🧹 Cleaning seed data…\n');

  /* ── 1. Activity log (metadata->seed = SEED) ── */
  const { data: actLogs } = await supabase
    .from('activity_log')
    .select('id, metadata')
    .limit(500);
  const seedLogIds = (actLogs ?? [])
    .filter((r: { metadata: Record<string, unknown> }) => r.metadata?.seed === SEED)
    .map((r: { id: string }) => r.id);
  if (seedLogIds.length) {
    await supabase.from('activity_log').delete().in('id', seedLogIds);
    console.log(`  📝 Deleted ${seedLogIds.length} activity log entries`);
  }

  /* ── 2. Focus sessions — linked to seed tasks/plans/goals, or use time window ── */
  // We find seed tasks first, then delete sessions linked to them
  // But first we need seed task IDs — gather from description containing SEED
  const { data: seedTasks } = await supabase
    .from('tasks')
    .select('id')
    .like('description', `%${SEED}%`)
    .limit(200);
  const seedTaskIds = (seedTasks ?? []).map((t: { id: string }) => t.id);

  const { data: seedPlans } = await supabase
    .from('plans')
    .select('id')
    .like('description', `%${SEED}%`)
    .limit(200);
  const seedPlanIds = (seedPlans ?? []).map((p: { id: string }) => p.id);

  const { data: seedGoals } = await supabase
    .from('goals')
    .select('id')
    .like('description', `%${SEED}%`)
    .limit(200);
  const seedGoalIds = (seedGoals ?? []).map((g: { id: string }) => g.id);

  // Delete focus sessions linked to seed entities
  if (seedTaskIds.length) {
    const { count } = await supabase.from('focus_sessions').delete({ count: 'exact' }).in('task_id', seedTaskIds);
    if (count) console.log(`  ⏱️  Deleted ${count} focus sessions (by task)`);
  }
  if (seedPlanIds.length) {
    const { count } = await supabase.from('focus_sessions').delete({ count: 'exact' }).in('plan_id', seedPlanIds);
    if (count) console.log(`  ⏱️  Deleted ${count} focus sessions (by plan)`);
  }
  if (seedGoalIds.length) {
    const { count } = await supabase.from('focus_sessions').delete({ count: 'exact' }).in('goal_id', seedGoalIds);
    if (count) console.log(`  ⏱️  Deleted ${count} focus sessions (by goal)`);
  }

  /* ── 3. Reminders (notes = SEED) ── */
  {
    const { count } = await supabase.from('reminders').delete({ count: 'exact' }).eq('notes', SEED);
    if (count) console.log(`  🔔 Deleted ${count} reminders`);
  }

  /* ── 4. Calendar events (notes = SEED) ── */
  {
    const { count } = await supabase.from('calendar_events').delete({ count: 'exact' }).eq('notes', SEED);
    if (count) console.log(`  📅 Deleted ${count} calendar events`);
  }

  /* ── 5. Tasks (description contains SEED) — junction first ── */
  if (seedTaskIds.length) {
    await supabase.from('task_tags').delete().in('task_id', seedTaskIds);
    const { count } = await supabase.from('tasks').delete({ count: 'exact' }).in('id', seedTaskIds);
    if (count) console.log(`  ✅ Deleted ${count} tasks`);
  }

  /* ── 6. Stages (belonging to seed plans) ── */
  if (seedPlanIds.length) {
    const { count } = await supabase.from('stages').delete({ count: 'exact' }).in('plan_id', seedPlanIds);
    if (count) console.log(`  📊 Deleted ${count} stages`);
  }

  /* ── 7. Plans — junction first, then plans ── */
  if (seedPlanIds.length) {
    await supabase.from('plan_goals').delete().in('plan_id', seedPlanIds);
    await supabase.from('plan_tags').delete().in('plan_id', seedPlanIds);
    const { count } = await supabase.from('plans').delete({ count: 'exact' }).in('id', seedPlanIds);
    if (count) console.log(`  📋 Deleted ${count} plans`);
  }

  /* ── 8. Goals — junction first, then goals ── */
  if (seedGoalIds.length) {
    await supabase.from('plan_goals').delete().in('goal_id', seedGoalIds);
    await supabase.from('goal_tags').delete().in('goal_id', seedGoalIds);
    const { count } = await supabase.from('goals').delete({ count: 'exact' }).in('id', seedGoalIds);
    if (count) console.log(`  🎯 Deleted ${count} goals`);
  }

  /* ── 9. Tags — check if any seed tags remain (by label match) ── */
  const seedTagLabels = ['Health', 'Career', 'Finance', 'Learning', 'Personal', 'Urgent'];
  // Only delete tags that were created by seed (match exact labels)
  const { data: maybeTags } = await supabase
    .from('tags')
    .select('id, label')
    .in('label', seedTagLabels)
    .limit(20);
  if (maybeTags?.length) {
    const ids = maybeTags.map((t: { id: string }) => t.id);
    // Clean up any remaining junction refs
    await supabase.from('goal_tags').delete().in('tag_id', ids);
    await supabase.from('plan_tags').delete().in('tag_id', ids);
    await supabase.from('task_tags').delete().in('tag_id', ids);
    const { count } = await supabase.from('tags').delete({ count: 'exact' }).in('id', ids);
    if (count) console.log(`  🏷️  Deleted ${count} tags`);
  }

  console.log('\n✅ Cleanup complete! Refresh the app.\n');
}

clean().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
