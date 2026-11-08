"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { syncFromRemote } from "@/lib/progress";

/** Email + password sign-in. Hidden when the server has no database (local mode). */
export function AccountButton({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const [state, setState] = useState<{ enabled: boolean; email: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setState({ enabled: j.enabled, email: j.user?.email ?? null }))
      .catch(() => setState({ enabled: false, email: null }));
  }, []);

  if (!state?.enabled) return null;

  if (state.email)
    return (
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          setState({ ...state, email: null });
        }}
        className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title={state.email}
      >
        {d.signOut}
      </button>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(j.error === "exists" ? d.errExists : j.error === "wrong" ? d.errWrong : d.errInvalid);
      return;
    }
    setState({ enabled: true, email: j.user.email });
    setOpen(false);
    void syncFromRemote();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-md bg-sky-700 px-3 py-1 text-sm font-medium text-white">
        {d.signIn}
      </button>
      {open && (
        <form onSubmit={submit} className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-semibold">{mode === "login" ? d.signIn : d.register}</p>
          <label className="block text-sm">
            {d.email}
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700" />
          </label>
          <label className="block text-sm">
            {d.password}
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="w-full rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {mode === "login" ? d.signIn : d.register}
          </button>
          <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="w-full text-sm text-sky-700 underline dark:text-sky-400">
            {mode === "login" ? d.noAccount : d.haveAccount}
          </button>
        </form>
      )}
    </div>
  );
}
