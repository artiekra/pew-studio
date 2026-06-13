import * as FileSystem from "expo-file-system/legacy";
import { deleteProjectFiles, initProjectFiles } from "./fileSystem";

// ── Types ────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

// ── Storage keys ─────────────────────────────────────────────────────

const PROJECTS_FILE = `${FileSystem.documentDirectory}pewpew_projects.json`;

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  try {
    const info = await FileSystem.getInfoAsync(PROJECTS_FILE);
    if (!info.exists) return [];
    const content = await FileSystem.readAsStringAsync(PROJECTS_FILE);
    return JSON.parse(content) as Project[];
  } catch (e) {
    console.error("Failed to read projects file:", e);
    return [];
  }
}

async function saveProjects(projects: Project[]): Promise<void> {
  await FileSystem.writeAsStringAsync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
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
