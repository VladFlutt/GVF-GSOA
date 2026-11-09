import type { Metadata } from "next";
import Link from "next/link";
import "../globals.css";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { AccountButton } from "@/components/AccountButton";

export const metadata: Metadata = {
  title: "GVF Academy",
  description: "Interactive preparation for GVF / GSOA satellite certification",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href={`/${locale}`} className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-sky-700 text-xs font-bold text-white">G</span>
              {d.appName}
            </Link>
            <div className="flex items-center gap-2">
              <Link href={`/${locale}/glossary`} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                {d.glossary}
              </Link>
              <LocaleSwitcher locale={locale} />
              <AccountButton locale={locale} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
