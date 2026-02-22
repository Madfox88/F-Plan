import { supabase } from '../lib/supabase';

const tables = ['workspaces', 'plans', 'stages'];

export async function verifySchema(): Promise<void> {
  if (!import.meta.env.DEV) return;

  console.log('🔍 Verifying database schema...');

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: OK`);
      }
    } catch (err) {
      console.error(`❌ ${table}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  console.log('✓ Schema verification complete');
}
