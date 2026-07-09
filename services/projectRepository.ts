import * as FileSystem from "expo-file-system/legacy";
import { ensureAssetsAreCopied, type ProjectTemplate } from "./assetService";
import { importProjectFromZip } from "./zipService";
import { getProjectDir } from "./fileIO";
import type { Project } from "@/types";

import * as Crypto from "expo-crypto";

const PROJECTS_FILE = `${FileSystem.documentDirectory}pewpew_projects.json`;

function generateId(): string {
  return Crypto.randomUUID();
}

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

export async function createProject(
  name: string,
  template: ProjectTemplate = "basic"
): Promise<Project> {
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

  const projectDir = getProjectDir(project.id);
  await FileSystem.makeDirectoryAsync(projectDir, { intermediates: true });
  await ensureAssetsAreCopied(project.id, template);

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

  const projectDir = getProjectDir(project.id);
  await FileSystem.makeDirectoryAsync(projectDir, { intermediates: true });
  await importProjectFromZip(project.id, zipUri);

  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects();
  await saveProjects(projects.filter((p) => p.id !== id));

  const projectDir = getProjectDir(id);
  const info = await FileSystem.getInfoAsync(projectDir);
  if (info.exists) {
    await FileSystem.deleteAsync(projectDir, { idempotent: true });
  }
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

export async function duplicateProject(id: string): Promise<Project | null> {
  const projects = await getProjects();
  const projectToCopy = projects.find((p) => p.id === id);
  if (!projectToCopy) return null;

  const now = new Date().toISOString();
  const newProject: Project = {
    id: generateId(),
    name: `${projectToCopy.name} Copy`,
    color: projectToCopy.color,
    createdAt: now,
    updatedAt: now,
  };

  projects.unshift(newProject);
  await saveProjects(projects);

  const sourceDir = getProjectDir(id);
  const targetDir = getProjectDir(newProject.id);

  const info = await FileSystem.getInfoAsync(sourceDir);
  if (info.exists) {
    await FileSystem.copyAsync({
      from: sourceDir,
      to: targetDir,
    });
  } else {
    // If source doesn't exist for some reason, just create an empty folder
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    await ensureAssetsAreCopied(newProject.id);
  }

  return newProject;
}
