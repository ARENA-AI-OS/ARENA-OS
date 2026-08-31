// @arena-os/firebase
// Firebase integration adapter.
// Stub for Prompt 1 — real integration comes in Prompt 4+.

export interface FirebaseConfig {
  projectId: string;
}

export function createFirebaseClient(_config: FirebaseConfig) {
  return {
    async getDocument(_collection: string, _id: string) {
      throw new Error("firebase: not yet implemented");
    },
  };
}
