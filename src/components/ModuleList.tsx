"use client";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { useProgress } from "@/lib/progress";

type ModuleSummary = { id: string; title: string; objectives: string[]; steps: { id: string; kind: string; title: string }[] };

export function ModuleList({ locale, courseId, modules }: { locale: Locale; courseId: string; modules: ModuleSummary[] }) {
  const d = getDictionary(locale);
  const { done } = useProgress(courseId);
  const total = modules.reduce((n, m) => n + m.steps.length, 0);
  const completed = modules.reduce((n, m) => n + m.steps.filter((s) => done.has(`${m.id}/${s.id}`)).length, 0);
  const icon = { theory: "📖", sim: "🎛️", quiz: "✍️" } as Record<string, string>;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm text-zinc-500">
          <span>{d.progress}</span>
          <span>
            {completed} / {total}
          </span>
        </div>
        <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full rounded bg-emerald-500 transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
        </div>
      </div>

      <ol className="space-y-4">
        {modules.map((m, mi) => {
          const firstOpen = m.steps.find((s) => !done.has(`${m.id}/${s.id}`)) ?? m.steps[0];
          const mDone = m.steps.filter((s) => done.has(`${m.id}/${s.id}`)).length;
          return (
            <li key={m.id} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {mi + 1}. {m.title}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {mDone} / {m.steps.length}
                  </p>
                </div>
                {firstOpen && (
                  <Link href={`/${locale}/courses/${courseId}/${m.id}/${firstOpen.id}`} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800">
                    {mDone === 0 ? d.start : d.continue}
                  </Link>
                )}
              </div>
              {m.objectives.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                  {m.objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
              <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                {m.steps.map((s) => (
                  <li key={s.id}>
                    <Link href={`/${locale}/courses/${courseId}/${m.id}/${s.id}`} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <span aria-hidden>{icon[s.kind]}</span>
                      <span className="flex-1">{s.title}</span>
                      {done.has(`${m.id}/${s.id}`) && <span className="text-emerald-600">✓</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
