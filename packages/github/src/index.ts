// @arena-os/github
// GitHub API integration adapter.
// Stub for Prompt 1 — real API calls come in Prompt 3+.

export interface GitHubConfig {
  token: string;
  baseUrl?: string;
}

export function createGitHubClient(_config: GitHubConfig) {
  return {
    async getIssue(_repo: string, _number: number) {
      throw new Error("github: not yet implemented");
    },
    async createBranch(_repo: string, _branch: string, _from: string) {
      throw new Error("github: not yet implemented");
    },
    async createPullRequest(_repo: string, _pr: { head: string; base: string; title: string; body: string }) {
      throw new Error("github: not yet implemented");
    },
  };
}
