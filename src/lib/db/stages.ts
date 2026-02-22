import { supabase } from '../supabase';
import type { Stage, StageWithTasks } from '../../types/database';

/* Stage Operations */
export async function getStagesByPlan(planId: string): Promise<StageWithTasks[]> {
  const { data, error } = await supabase
    .from('stages')
    .select(
      `
      *,
      tasks (*)
    `
    )
    .eq('plan_id', planId)
    .order('position', { ascending: true });

  if (error) throw new Error(`Failed to fetch stages: ${error.message}`);
  return data || [];
}

export async function createDefaultStages(planId: string): Promise<Stage[]> {
  const defaultStages = [
    'Initiating',
    'Planning',
    'Executing',
    'Controlling and Monitoring',
    'Closing',
  ];

  const stagesToInsert = defaultStages.map((title, position) => ({
    plan_id: planId,
    title,
    position,
  }));

  const { data, error } = await supabase
    .from('stages')
    .insert(stagesToInsert)
    .select();

  if (error) throw new Error(`Failed to create default stages: ${error.message}`);
  return data || [];
}

export async function createSuggestedStages(planId: string): Promise<Stage[]> {
  const suggestedStages = ['Thinking', 'Planning', 'Execution', 'Review'];

  const stagesToInsert = suggestedStages.map((title, position) => ({
    plan_id: planId,
    title,
    position,
  }));

  const { data, error } = await supabase
    .from('stages')
    .insert(stagesToInsert)
    .select();

  if (error) throw new Error(`Failed to create suggested stages: ${error.message}`);
  return data || [];
}

export async function createCustomStages(
  planId: string,
  stageNames: string[]
): Promise<Stage[]> {
  const stagesToInsert = stageNames
    .filter((name) => name.trim())
    .slice(0, 6)
    .map((title, position) => ({
      plan_id: planId,
      title: title.trim(),
      position,
    }));

  if (stagesToInsert.length === 0) {
    throw new Error('At least one stage name is required');
  }

  const { data, error } = await supabase
    .from('stages')
    .insert(stagesToInsert)
    .select();

  if (error) throw new Error(`Failed to create custom stages: ${error.message}`);
  return data || [];
}

export async function createStage(planId: string, title: string): Promise<Stage> {
  // Get the highest position to add the new stage at the end
  const { data: existingStages, error: fetchError } = await supabase
    .from('stages')
    .select('position')
    .eq('plan_id', planId)
    .order('position', { ascending: false })
    .limit(1);

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch stages: ${fetchError.message}`);
  }

  const position = existingStages && existingStages.length > 0 
    ? (existingStages[0].position || 0) + 1
    : 0;

  const { data, error } = await supabase
    .from('stages')
    .insert([{
      plan_id: planId,
      title: title.trim(),
      position,
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create stage: ${error.message}`);
  return data;
}

/** Update an existing stage's title and/or position. */
export async function updateStage(
  stageId: string,
  updates: Partial<{ title: string; position: number }>
): Promise<Stage> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.position !== undefined) payload.position = updates.position;

  if (Object.keys(payload).length === 0) {
    throw new Error('No updates provided');
  }

  const { data, error } = await supabase
    .from('stages')
    .update(payload)
    .eq('id', stageId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update stage: ${error.message}`);
  return data;
}

/**
 * Delete a stage and all its tasks (DB CASCADE).
 * Throws if it's the last stage in the plan — a plan must have ≥1 stage.
 */
export async function deleteStage(stageId: string, planId: string): Promise<void> {
  // Guard: ensure this isn't the only stage
  const { data: siblings } = await supabase
    .from('stages')
    .select('id')
    .eq('plan_id', planId);

  if (!siblings || siblings.length <= 1) {
    throw new Error('Cannot delete the only stage in a plan');
  }

  const { error } = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId);

  if (error) throw new Error(`Failed to delete stage: ${error.message}`);
}
