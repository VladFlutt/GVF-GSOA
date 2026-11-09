"use client";
import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { t } from "@/content/l10n";
import type { Question, QuizStep } from "@/content/types";

function sample<T>(items: T[], n: number, seed: number): T[] {
  const a = items.slice();
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 16807) % 2147483647;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

type Phase = "intro" | "question" | "result";

export function Quiz({
  step,
  questions,
  locale,
  attemptsUsed,
  passedBefore,
  onAttempt,
  onReset,
}: {
  step: QuizStep;
  questions: Question[];
  locale: Locale;
  attemptsUsed: number;
  passedBefore: boolean;
  onAttempt: (passed: boolean) => void;
  onReset: () => void;
}) {
  const d = getDictionary(locale);
  const [phase, setPhase] = useState<Phase>("intro");
  const [seed, setSeed] = useState(1);
  const set = useMemo(() => sample(questions, Math.min(step.perAttempt, questions.length), seed), [questions, step.perAttempt, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const left = step.attempts - attemptsUsed;

  const q = set[i];
  const isCorrect = q && picked.length === q.correct.length && q.correct.every((c) => picked.includes(c));

  function start() {
    setSeed(Date.now() % 2147483647);
    setI(0);
    setPicked([]);
    setChecked(false);
    setCorrectCount(0);
    setPhase("question");
  }

  function check() {
    setChecked(true);
    if (isCorrect) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (i + 1 < set.length) {
      setI(i + 1);
      setPicked([]);
      setChecked(false);
    } else {
      onAttempt(correctCount >= step.passMark);
      setPhase("result");
    }
  }

  if (phase === "intro") {
    return (
      <div className="space-y-4">
        <p>{d.quizRules(Math.min(step.perAttempt, questions.length), step.passMark, step.attempts)}</p>
        {passedBefore && <p className="font-medium text-emerald-700 dark:text-emerald-400">✓ {d.passed}</p>}
        {left > 0 ? (
          <>
            <p className="text-sm text-zinc-500">{d.attemptsLeft(left)}</p>
            <button onClick={start} className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800">
              {d.startQuiz}
            </button>
          </>
        ) : (
          <>
            <p className="text-amber-700 dark:text-amber-400">{d.noAttempts}</p>
            <button onClick={onReset} className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700">
              {d.reset}
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "result") {
    const passed = correctCount >= step.passMark;
    return (
      <div className="space-y-3">
        <p className={`text-xl font-semibold ${passed ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>{passed ? d.passed : d.failed}</p>
        <p>{d.score(correctCount, set.length)}</p>
        {!passed && left - 1 > 0 && (
          <button onClick={start} className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white">
            {d.retry}
          </button>
        )}
        {!passed && left - 1 <= 0 && <p className="text-amber-700 dark:text-amber-400">{d.noAttempts}</p>}
      </div>
    );
  }

  const multi = q.type === "multi";
  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-500">
        {i + 1} / {set.length} · {multi ? d.chooseMany : d.chooseOne}
      </div>
      <p className="text-lg font-medium">{t(q.prompt, locale)}</p>
      <ul className="space-y-2">
        {q.options.map((o) => {
          const on = picked.includes(o.id);
          const good = checked && q.correct.includes(o.id);
          const bad = checked && on && !q.correct.includes(o.id);
          return (
            <li key={o.id}>
              <button
                disabled={checked}
                onClick={() => setPicked(multi ? (on ? picked.filter((p) => p !== o.id) : [...picked, o.id]) : [o.id])}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition ${
                  good ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" : bad ? "border-red-500 bg-red-50 dark:bg-red-950/40" : on ? "border-sky-600 bg-sky-50 dark:bg-sky-950/40" : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                <span className={`mt-0.5 inline-block h-4 w-4 shrink-0 border ${multi ? "rounded" : "rounded-full"} ${on ? "border-sky-700 bg-sky-700" : "border-zinc-400"}`} />
                <span>{t(o.text, locale)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {checked && (
        <div className={`rounded-md p-3 text-sm ${isCorrect ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-amber-50 dark:bg-amber-950/40"}`}>
          <p className="mb-1 font-semibold">{isCorrect ? d.correct : d.incorrect}</p>
          <p>{t(q.explanation, locale)}</p>
        </div>
      )}
      {!checked ? (
        <button disabled={picked.length === 0} onClick={check} className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white disabled:opacity-40">
          {d.check}
        </button>
      ) : (
        <button onClick={next} className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white">
          {i + 1 < set.length ? d.nextQuestion : d.showResult}
        </button>
      )}
    </div>
  );
}
