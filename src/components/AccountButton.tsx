"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSupabase } from "@/lib/supabase";
import { syncFromRemote } from "@/lib/progress";

/** Email magic-link sign-in. Hidden when Supabase is not configured (local mode). */
export function AccountButton({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const sb = getSupabase();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = sb.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
      if (session) void syncFromRemote();
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  if (!sb) return null;
  if (email)
    return (
      <button onClick={() => sb.auth.signOut()} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" title={email}>
        {d.signOut}
      </button>
    );

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-md bg-sky-700 px-3 py-1 text-sm font-medium text-white">
        {d.signIn}
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await sb.auth.signInWithOtp({ email: input, options: { emailRedirectTo: window.location.href } });
            setSent(true);
          }}
          className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {sent ? (
            <p className="text-sm">{d.linkSent}</p>
          ) : (
            <>
              <label className="block text-sm">
                {d.email}
                <input type="email" required value={input} onChange={(e) => setInput(e.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700" />
              </label>
              <button className="w-full rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white">{d.sendLink}</button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
