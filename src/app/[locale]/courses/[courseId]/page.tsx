import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCourse, listCourses } from "@/content/loader";
import { t } from "@/content/l10n";
import { ModuleList } from "@/components/ModuleList";

export function generateStaticParams() {
  return listCourses().map((c) => ({ courseId: c.id }));
}

export default async function CoursePage({ params }: { params: Promise<{ locale: string; courseId: string }> }) {
  const { locale, courseId } = await params;
  const course = getCourse(courseId);
  if (!isLocale(locale) || !course) notFound();
  const d = getDictionary(locale);

  const modules = course.modules.map((m) => ({
    id: m.id,
    title: t(m.title, locale),
    objectives: m.objectives.map((o) => t(o, locale)),
    steps: m.steps.map((s) => ({ id: s.id, kind: s.kind, title: t(s.title, locale) })),
  }));

  return (
    <div className="space-y-8">
      <section>
        <div className="text-sm font-semibold tracking-wide text-sky-700 dark:text-sky-400">{course.code}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t(course.title, locale)}</h1>
        <p className="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-400">{t(course.summary, locale)}</p>
        {course.prerequisites.length > 0 && (
          <p className="mt-3 text-sm text-zinc-500">
            {d.prerequisites}: {course.prerequisites.map((p) => t(p, locale)).join("; ")}
          </p>
        )}
      </section>
      <ModuleList locale={locale} courseId={course.id} modules={modules} />
    </div>
  );
}
