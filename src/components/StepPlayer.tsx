"use client";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { t } from "@/content/l10n";
import type { Question, Step } from "@/content/types";
import { useProgress } from "@/lib/progress";
import { AcuSimulator } from "./sim/acu/AcuSimulator";
import { Quiz } from "./quiz/Quiz";
import { Prose } from "./Prose";

export function StepPlayer({
  locale,
  courseId,
  moduleId,
  step,
  questions,
  prevHref,
  nextHref,
}: {
  locale: Locale;
  courseId: string;
  moduleId: string;
  step: Step;
  questions: Question[];
  prevHref: string | null;
  nextHref: string;
}) {
  const d = getDictionary(locale);
  const key = `${moduleId}/${step.id}`;
  const { done, markDone, attempts, recordAttempt, resetAttempts } = useProgress(courseId);
  const isDone = done.has(key);

  // Reading a theory page counts as completing it.
  useEffect(() => {
    if (step.kind === "theory") markDone(key);
  }, [step.kind, key, markDone]);

  const onSimComplete = useCallback(() => markDone(key), [markDone, key]);
  const canAdvance = step.kind === "theory" || isDone;
  const kindLabel = { theory: d.theory, sim: d.simulation, quiz: d.quiz }[step.kind];

  return (
    <article className="space-y-6">
      <header>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-400">
          {kindLabel}
          {isDone && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 normal-case dark:bg-emerald-900/50 dark:text-emerald-300">✓ {d.completed}</span>}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(step.title, locale)}</h1>
      </header>

      {step.kind === "theory" && (
        <>
          <Prose paragraphs={step.body.map((p) => t(p, locale))} />
          {[...(step.figures ?? []), ...(step.figure ? [step.figure] : [])].map((f) => (
            <figure key={f.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.src} alt={t(f.caption, locale)} loading="lazy" className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800" />
              <figcaption className="mt-2 text-sm text-zinc-500">{t(f.caption, locale)}</figcaption>
            </figure>
          ))}
        </>
      )}

      {step.kind === "sim" && (
        <>
          <Prose paragraphs={[t(step.intro, locale)]} />
          <div className={`rounded-md border-l-4 p-3 ${isDone ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-sky-600 bg-sky-50 dark:bg-sky-950/30"}`}>
            <div className="text-xs font-semibold tracking-wide uppercase">{isDone ? `✓ ${d.taskDone}` : d.task}</div>
            <p className="mt-1">{t(step.task, locale)}</p>
          </div>
          <AcuSimulator key={step.id} scenario={step.scenario} locale={locale} onComplete={onSimComplete} />
        </>
      )}

      {step.kind === "quiz" && (
        <Quiz
          step={step}
          questions={questions}
          locale={locale}
          attemptsUsed={attempts(key)}
          passedBefore={isDone}
          onAttempt={(passed) => {
            recordAttempt(key, passed);
            if (passed) markDone(key);
          }}
          onReset={() => resetAttempts(key)}
        />
      )}

      <nav className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {prevHref ? (
          <Link href={prevHref} className="rounded-md px-3 py-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
            ← {d.back}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={nextHref}
          aria-disabled={!canAdvance}
          className={`rounded-md px-4 py-2 font-medium ${canAdvance ? "bg-sky-700 text-white hover:bg-sky-800" : "pointer-events-none bg-zinc-200 text-zinc-500 dark:bg-zinc-800"}`}
        >
          {d.next} →
        </Link>
      </nav>
    </article>
  );
}
