import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { listCourses } from "@/content/loader";
import { t } from "@/content/l10n";

export default async function Catalog({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const courses = listCourses();
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">{d.tagline}</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{d.catalogLead}</p>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-500 uppercase">{d.catalog}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Link href={`/${locale}/courses/${c.id}`} className="block h-full rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-sky-600 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-400">{c.code}</div>
                <div className="mt-1 text-lg font-semibold">{t(c.title, locale)}</div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t(c.summary, locale)}</p>
                <div className="mt-4 text-sm text-zinc-500">
                  {c.modules.length} {d.modules}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
