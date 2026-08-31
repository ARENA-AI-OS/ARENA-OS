// @arena-os/database
// Shared database schema, types, and repository interface.
// This package re-exports the Drizzle schema and domain types so that
// both the web app and future packages can share the same data model.

export interface Workspace {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  repository?: string;
  integrations: string[];
  environment: string;
  budgetXlm: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
  lastLoginAt?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  projectId?: string;
  userId: string;
}

// Repository interface — implemented by memory-repo and pg-repo.
export interface Repository {
  getWorkspace(id: string): Promise<Workspace | undefined>;
  ensureSeedWorkspace(): Promise<Workspace>;
  listProjects(workspaceId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(p: Project): Promise<Project>;
  listMissions(workspaceId: string): Promise<Mission[]>;
  getMission(id: string): Promise<Mission | undefined>;
  saveMission(m: Mission): Promise<Mission>;
}
