"use client";
import { useEffect, useState } from "react";
import type { GlossaryTerm } from "@/content/types";

/** Searchable glossary. The entry named in the URL hash is highlighted. */
export function GlossaryList({ terms, placeholder }: { terms: GlossaryTerm[]; placeholder: string }) {
  const [q, setQ] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(decodeURIComponent(location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: "center" });
  }, [hash]);

  const needle = q.trim().toLocaleLowerCase();
  const shown = needle ? terms.filter((e) => `${e.term} ${e.def}`.toLocaleLowerCase().includes(needle)) : terms;

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {shown.map((e) => (
          <div key={e.id} id={e.id} className={`scroll-mt-24 p-4 ${hash === e.id ? "bg-sky-50 dark:bg-sky-950/40" : ""}`}>
            <dt className="font-semibold">{e.term}</dt>
            <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{e.def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
