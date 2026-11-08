"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Learner progress: the set of completed step keys ("<moduleId>/<stepId>") per course,
 * plus quiz attempts. Always kept in localStorage; mirrored to the server (Neon) when signed in.
 */
type CourseProgress = { done: string[]; quizAttempts: Record<string, number> };
type Store = Record<string, CourseProgress>;

const KEY = "gvf-progress-v1";
const listeners = new Set<() => void>();
let cache: Store | null = null;

function load(): Store {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    cache = {};
  }
  return cache;
}

function save(next: Store) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

function course(store: Store, id: string): CourseProgress {
  return store[id] ?? { done: [], quizAttempts: {} };
}

async function pushRemote(courseId: string, stepKey: string, kind: "done" | "attempt", passed?: boolean) {
  try {
    await fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ courseId, stepKey, kind, passed }),
    });
  } catch {
    /* offline or signed out: local progress is kept */
  }
}

/** Merge completed steps from the server into the local store (after sign-in), and upload local-only ones. */
export async function syncFromRemote() {
  let rows: { course_id: string; step_key: string }[];
  try {
    const res = await fetch("/api/progress");
    if (!res.ok) return;
    rows = (await res.json()).rows;
  } catch {
    return;
  }
  const next = { ...load() };
  const remote = new Set(rows.map((r) => `${r.course_id}|${r.step_key}`));
  for (const r of rows) {
    const c = course(next, r.course_id);
    if (!c.done.includes(r.step_key)) next[r.course_id] = { ...c, done: [...c.done, r.step_key] };
  }
  save(next);
  for (const [courseId, c] of Object.entries(next))
    for (const key of c.done) if (!remote.has(`${courseId}|${key}`)) void pushRemote(courseId, key, "done");
}

const empty: Store = {};
export function useProgress(courseId: string) {
  const store = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => empty,
  );
  useEffect(() => {
    void syncFromRemote();
  }, []);
  const p = course(store, courseId);

  const markDone = useCallback(
    (stepKey: string) => {
      const s = load();
      const c = course(s, courseId);
      if (c.done.includes(stepKey)) return;
      save({ ...s, [courseId]: { ...c, done: [...c.done, stepKey] } });
      void pushRemote(courseId, stepKey, "done");
    },
    [courseId],
  );

  const recordAttempt = useCallback(
    (stepKey: string, passed: boolean) => {
      const s = load();
      const c = course(s, courseId);
      const n = (c.quizAttempts[stepKey] ?? 0) + 1;
      save({ ...s, [courseId]: { ...c, quizAttempts: { ...c.quizAttempts, [stepKey]: n } } });
      void pushRemote(courseId, stepKey, "attempt", passed);
    },
    [courseId],
  );

  const resetAttempts = useCallback(
    (stepKey: string) => {
      const s = load();
      const c = course(s, courseId);
      const rest = { ...c.quizAttempts };
      delete rest[stepKey];
      save({ ...s, [courseId]: { ...c, quizAttempts: rest } });
    },
    [courseId],
  );

  return {
    done: new Set(p.done),
    attempts: (stepKey: string) => p.quizAttempts[stepKey] ?? 0,
    markDone,
    recordAttempt,
    resetAttempts,
  };
}
