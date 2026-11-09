"use client";
import { createContext, useContext, useMemo } from "react";
import type { GlossaryTerm } from "@/content/types";
import { Term } from "./Term";

/** Glossary for the current page: terms, the glossary page URL and the link label. */
export const GlossaryContext = createContext<{ terms: GlossaryTerm[]; href: string; linkLabel: string } | null>(null);

type Matcher = { re: RegExp; ids: string[]; byId: Map<string, GlossaryTerm> } | null;

function buildMatcher(terms: GlossaryTerm[]): Matcher {
  const alts: { src: string; id: string }[] = [];
  for (const e of terms) for (const m of e.match) alts.push({ src: m.replace(/\((?!\?)/g, "(?:"), id: e.id });
  if (!alts.length) return null;
  // Longer patterns first, so "relative azimuth" wins over "azimuth".
  alts.sort((a, b) => b.src.length - a.src.length);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts.map((a) => `(${a.src})`).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return { re, ids: alts.map((a) => a.id), byId: new Map(terms.map((t) => [t.id, t])) };
}

/** Renders course paragraphs. A paragraph made of "- " lines becomes a bullet list; **bold** is supported.
 *  The first mention of each glossary term on the page gets an explanation popover. */
export function Prose({ paragraphs }: { paragraphs: string[] }) {
  const g = useContext(GlossaryContext);
  const matcher = useMemo(() => (g ? buildMatcher(g.terms) : null), [g]);
  const seen = new Set<string>();
  let key = 0;

  const terms = (text: string): React.ReactNode[] => {
    if (!matcher || !g) return [text];
    const out: React.ReactNode[] = [];
    let last = 0;
    matcher.re.lastIndex = 0;
    for (let m = matcher.re.exec(text); m; m = matcher.re.exec(text)) {
      const gi = m.slice(1).findIndex((x) => x !== undefined);
      const id = matcher.ids[gi];
      if (seen.has(id)) continue;
      seen.add(id);
      const entry = matcher.byId.get(id)!;
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(
        <Term key={`t${key++}`} entry={entry} href={`${g.href}#${id}`} linkLabel={g.linkLabel}>
          {m[0]}
        </Term>,
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  const inline = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{terms(part.slice(2, -2))}</strong> : <span key={i}>{terms(part)}</span>,
    );

  return (
    <div className="space-y-4 text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
      {paragraphs.map((p, i) => {
        const lines = p.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(p)}</p>;
      })}
    </div>
  );
}
