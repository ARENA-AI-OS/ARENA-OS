// @arena-os/supabase
// Supabase integration adapter.
// Stub for Prompt 1 — real integration comes in Prompt 4+.

export interface SupabaseConfig {
  url: string;
  serviceKey: string;
}

export function createSupabaseClient(_config: SupabaseConfig) {
  return {
    async query(_sql: string) {
      throw new Error("supabase: not yet implemented");
    },
  };
}
