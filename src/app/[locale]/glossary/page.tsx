import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getGlossary } from "@/content/loader";
import { GlossaryList } from "@/components/GlossaryList";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function GlossaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{d.glossaryTitle}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{d.glossaryLead}</p>
      </header>
      <GlossaryList terms={getGlossary(locale)} placeholder={d.glossarySearch} />
    </div>
  );
}
