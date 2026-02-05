import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnvError = new Error(
  'Supabase environment variables are missing. The app is running in offline/demo mode.'
);

const createOfflineQueryBuilder = () => {
  const result = { data: [] as unknown[], error: missingEnvError };
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => ({ data: null, error: missingEnvError }),
    maybeSingle: async () => ({ data: null, error: missingEnvError }),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
};

const createOfflineStorage = () => ({
  list: async () => ({ data: [] as unknown[], error: missingEnvError }),
  getPublicUrl: (_path: string) => ({ data: { publicUrl: '' }, error: missingEnvError }),
});

const createOfflineClient = (): SupabaseClient =>
  ({
    from: () => createOfflineQueryBuilder(),
    storage: {
      from: () => createOfflineStorage(),
    },
  } as unknown as SupabaseClient);

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : createOfflineClient();

if (!supabaseConfigured && typeof console !== 'undefined') {
  console.warn(missingEnvError.message);
}
