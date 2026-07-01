import * as FileSystem from "expo-file-system/legacy";
import { deleteProjectFiles, initProjectFiles, importProjectFiles } from "./fileSystem";

import type { Project } from "@/types";
// ── Storage keys ─────────────────────────────────────────────────────

const PROJECTS_FILE = `${FileSystem.documentDirectory}pewpew_projects.json`;

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
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

export async function importProject(name: string, zipUri: string): Promise<Project> {
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
  await importProjectFiles(project.id, zipUri);
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

export async function updateProjectColor(id: string, color?: string): Promise<void> {
  const projects = await getProjects();
  const project = projects.find((p) => p.id === id);
  if (project) {
    project.color = color;
    project.updatedAt = new Date().toISOString();
    await saveProjects(projects);
  }
}
