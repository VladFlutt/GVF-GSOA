"use client";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { GlossaryTerm } from "@/content/types";

/**
 * A glossary term inside course text: dotted underline, explanation on hover, focus or tap.
 * The popover is positioned in the viewport so it never runs off a phone screen.
 */
export function Term({ entry, href, linkLabel, children }: { entry: GlossaryTerm; href: string; linkLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useLayoutEffect(() => {
    if (!open || !ref.current || !pop.current) return;
    const r = ref.current.getBoundingClientRect();
    const w = pop.current.offsetWidth;
    const h = pop.current.offsetHeight;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const above = r.bottom + h + 12 > window.innerHeight && r.top > h + 12;
    setPos({ left, top: above ? r.top - h - 8 : r.bottom + 8, above });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && (ref.current?.contains(e.target as Node) || pop.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    const reposition = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  return (
    <span className="relative">
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="cursor-help underline decoration-sky-600/70 decoration-dotted decoration-2 underline-offset-4 hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 dark:decoration-sky-400/70 dark:hover:bg-sky-950/40"
      >
        {children}
      </span>
      {open && (
        <span
          ref={pop}
          id={id}
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{ position: "fixed", left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
          className="z-50 block w-80 max-w-[calc(100vw-16px)] rounded-lg border border-zinc-200 bg-white p-3 text-left text-sm leading-snug font-normal text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <span className="mb-1 block font-semibold text-zinc-900 dark:text-white">{entry.term}</span>
          <span className="block">{entry.def}</span>
          <Link href={href} className="mt-2 inline-block text-sky-700 hover:underline dark:text-sky-400">
            {linkLabel} →
          </Link>
        </span>
      )}
    </span>
  );
}
