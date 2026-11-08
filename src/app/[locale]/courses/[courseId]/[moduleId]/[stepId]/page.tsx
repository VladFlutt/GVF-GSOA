import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCourse, getQuestions, listCourses } from "@/content/loader";
import { t } from "@/content/l10n";
import { StepPlayer } from "@/components/StepPlayer";

export function generateStaticParams() {
  return listCourses().flatMap((c) => c.modules.flatMap((m) => m.steps.map((s) => ({ courseId: c.id, moduleId: m.id, stepId: s.id }))));
}

export default async function StepPage({ params }: { params: Promise<{ locale: string; courseId: string; moduleId: string; stepId: string }> }) {
  const { locale, courseId, moduleId, stepId } = await params;
  const course = getCourse(courseId);
  if (!isLocale(locale) || !course) notFound();
  const mi = course.modules.findIndex((m) => m.id === moduleId);
  const mod = course.modules[mi];
  const si = mod?.steps.findIndex((s) => s.id === stepId) ?? -1;
  const step = mod?.steps[si];
  if (!mod || !step) notFound();
  const d = getDictionary(locale);

  const base = `/${locale}/courses/${course.id}`;
  const flat = course.modules.flatMap((m) => m.steps.map((s) => `${base}/${m.id}/${s.id}`));
  const here = flat.indexOf(`${base}/${mod.id}/${step.id}`);
  const prevHref = here > 0 ? flat[here - 1] : null;
  const nextHref = here < flat.length - 1 ? flat[here + 1] : base;
  const questions = step.kind === "quiz" ? getQuestions(course.id, step.questions) : [];

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <Link href={base} className="text-sm text-zinc-500 hover:underline">
          ← {d.toCourse}
        </Link>
        <div className="mt-3 text-sm font-semibold">
          {mi + 1}. {t(mod.title, locale)}
        </div>
        <ol className="mt-2 space-y-0.5 border-l border-zinc-200 dark:border-zinc-800">
          {mod.steps.map((s) => (
            <li key={s.id}>
              <Link
                href={`${base}/${mod.id}/${s.id}`}
                className={`-ml-px block border-l-2 py-1 pl-3 text-sm ${s.id === step.id ? "border-sky-600 font-medium text-sky-800 dark:text-sky-300" : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"}`}
              >
                {t(s.title, locale)}
              </Link>
            </li>
          ))}
        </ol>
      </aside>
      <div className="min-w-0">
        <div className="mb-4 text-sm text-zinc-500 lg:hidden">
          <Link href={base} className="hover:underline">
            {t(course.title, locale)}
          </Link>{" "}
          · {d.step} {si + 1} {d.of} {mod.steps.length}
        </div>
        <StepPlayer locale={locale} courseId={course.id} moduleId={mod.id} step={step} questions={questions} prevHref={prevHref} nextHref={nextHref} />
      </div>
    </div>
  );
}
