import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteProjectFiles, initProjectFiles } from "./fileSystem";

// ── Types ────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

// ── Storage keys ─────────────────────────────────────────────────────

const PROJECTS_KEY = "pewpew_projects";

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Project[];
}

async function saveProjects(projects: Project[]): Promise<void> {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function createProject(name: string): Promise<Project> {
  const projects = await getProjects();
  const now = new Date().toISOString();
  const project: Project = {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
  };
  projects.unshift(project); // newest first
  await saveProjects(projects);
  await initProjectFiles(project.id);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  await saveProjects(projects.filter((p) => p.id !== id));
  await deleteProjectFiles(id);
}

export async function renameProject(id: string, newName: string): Promise<void> {
  const projects = await getProjects();
  const project = projects.find((p) => p.id === id);
  if (project) {
    project.name = newName;
    project.updatedAt = new Date().toISOString();
    await saveProjects(projects);
  }
}
