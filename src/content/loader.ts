import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Course, Question } from "./types";

/**
 * Courses are plain data in /content/courses/<id>/:
 *   course.json     – structure, theory text, simulation and quiz steps
 *   questions.json  – the question bank used by quiz steps
 * Adding a course = adding a folder. No code changes needed.
 */
const ROOT = path.join(process.cwd(), "content", "courses");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function listCourses(): Course[] {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, "course.json")))
    .map((d) => readJson<Course>(path.join(ROOT, d.name, "course.json")))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function getCourse(id: string): Course | undefined {
  const file = path.join(ROOT, id, "course.json");
  if (!/^[a-z0-9-]+$/.test(id) || !fs.existsSync(file)) return undefined;
  return readJson<Course>(file);
}

export function getQuestions(courseId: string, ids: string[]): Question[] {
  const file = path.join(ROOT, courseId, "questions.json");
  if (!fs.existsSync(file)) return [];
  const bank = readJson<Question[]>(file);
  return ids.map((id) => bank.find((q) => q.id === id)).filter((q): q is Question => Boolean(q));
}
