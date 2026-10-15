"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL?.trim() || "https://demo-fastapi-with-zynnode.zynnode.cc").replace(/\/+$/, "");
type Task = { id: number; title: string; done: boolean };
type Stats = { total: number; done: number; remaining: number };
type Health = { environment: string };
type Connection = "checking" | "connected" | "unreachable";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`The API returned ${response.status}. Please try again.`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [connection, setConnection] = useState<Connection>("checking");
  const [environment, setEnvironment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [health, taskResult, statsResult] = await Promise.allSettled([
      request<Health>("/health"), request<Task[]>("/api/tasks"), request<Stats>("/api/stats"),
    ]);
    if (health.status === "fulfilled") {
      setConnection("connected");
      setEnvironment(health.value.environment);
    } else setConnection("unreachable");
    if (taskResult.status === "fulfilled") setTasks(taskResult.value);
    if (statsResult.status === "fulfilled") setStats(statsResult.value);
    else setStats(null);
    if (taskResult.status === "rejected" || statsResult.status === "rejected") {
      setError("We couldn’t refresh your checklist. Check your connection and try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function mutate(path: string, method: string, body?: string) {
    setBusy(true);
    setError("");
    try {
      await request<unknown>(path, {
        method,
        ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}),
      });
      if (method === "POST") setTitle("");
      await load();
    } catch (cause) {
      setError(cause instanceof TypeError || (cause instanceof Error && cause.name === "TimeoutError")
        ? "We couldn’t reach the API. Your change may not have been saved. Refresh before trying again."
        : cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
      // A failed mutation does not necessarily mean the health endpoint is down.
      try {
        const health = await request<Health>("/health");
        setEnvironment(health.environment);
        setConnection("connected");
      } catch { setConnection("unreachable"); }
    } finally { setBusy(false); }
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() && !busy && !loading) void mutate("/api/tasks", "POST", JSON.stringify({ title: title.trim() }));
  }

  const percent = stats && stats.total > 0 ? Math.min(100, Math.max(0, Math.round(stats.done / stats.total * 100))) : 0;
  const disabled = busy || loading;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink py-6 sm:py-8">
        <a href="/" className="flex items-center gap-3 text-xl font-black tracking-tight" aria-label="launchpad-web home">
          <span className="flex size-10 items-center justify-center rounded-full border-2 border-ink bg-teal text-cream" aria-hidden="true">↗</span>
          launchpad-web<span className="text-teal">.</span>
        </a>
        <div role="status" aria-label="API status" className={`flex items-center gap-2 rounded-full border-2 border-ink px-3 py-2 text-xs font-bold ${connection === "connected" ? "bg-mint text-teal" : connection === "unreachable" ? "bg-red-100 text-red-800" : "bg-gold/40"}`}>
          <span aria-hidden="true" className={`size-2 rounded-full ${connection === "connected" ? "bg-green-700" : connection === "unreachable" ? "bg-red-700" : "bg-ink"}`} />
          {connection === "connected" ? `API connected (env: ${environment})` : connection === "unreachable" ? "API unreachable" : "Checking API…"}
        </div>
      </header>

      <main className="w-full flex-1 py-12 sm:py-16">
        <div className="mb-9 flex items-start justify-between gap-3">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[.2em] text-teal">SMALL STEPS. BIG LIFTOFF.</p>
            <h1 className="text-4xl font-black tracking-[-.05em] sm:text-6xl">Launch Checklist<span className="text-teal">.</span></h1>
            <p className="mt-4 text-base text-ink/75 sm:text-lg">Make a plan. Check it off. Ship something great.</p>
          </div>
          <span aria-hidden="true" className="hidden size-20 shrink-0 -rotate-12 items-center justify-center rounded-full border-[3px] border-ink bg-gold text-5xl sm:flex">✦</span>
        </div>

        {connection === "unreachable" && (
          <aside className="mb-6 rounded-lg border-2 border-red-800 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-bold">Your launchpad is ready. Let’s connect the API.</p>
            <p className="mt-1">Set <code className="font-bold">NEXT_PUBLIC_API_URL</code> in <code>.env.local</code> to your API’s URL, then restart the app. For a deployment, set it before building. Make sure the API allows this site’s origin through CORS.</p>
          </aside>
        )}

        <section aria-label="Launch progress" className="card mb-7 rounded-xl bg-mint p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal">Your momentum</p>
              <p aria-live="polite" className="mt-1 text-2xl font-black">{loading ? "Checking progress…" : stats ? `${stats.done} of ${stats.total} done` : "Progress unavailable"}</p>
            </div>
            <span className="text-3xl font-black tracking-tight sm:text-4xl">{!loading && stats ? `${percent}%` : "—"}</span>
          </div>
          <div role="progressbar" aria-label="Tasks completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats && !loading ? percent : undefined} className="h-4 overflow-hidden rounded-full border-2 border-ink bg-cream">
            <div className="h-full bg-teal transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </section>

        <section aria-label="Your checklist" className="card overflow-hidden rounded-xl bg-white">
          <form onSubmit={addTask} className="border-b-2 border-ink bg-cream/60 p-5 sm:p-6">
            <label htmlFor="new-task" className="mb-3 block text-sm font-bold">What’s next on the launch plan?</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input id="new-task" name="title" value={title} onChange={event => setTitle(event.target.value)} maxLength={80} required placeholder="Add a task to your checklist…" className="min-w-0 flex-1 rounded-md border-2 border-ink bg-white px-4 py-3 text-sm placeholder:text-ink/50" />
              <button disabled={disabled || !title.trim()} type="submit" className="action shrink-0 rounded-md bg-gold px-5 py-3 text-sm font-bold">{busy ? "Saving…" : "+ Add task"}</button>
            </div>
          </form>

          {error && <div role="alert" className="border-b-2 border-ink bg-red-50 p-5 text-sm text-red-900"><p>{error}</p><button type="button" disabled={disabled} onClick={() => void load()} className="mt-2 font-bold underline underline-offset-4">Refresh checklist</button></div>}

          <div aria-busy={loading || busy}>
            {loading ? <p role="status" className="p-10 text-center text-sm text-teal">Getting your launch plan ready…</p> : tasks.length === 0 ? <div className="px-5 py-12 text-center"><span aria-hidden="true" className="text-3xl">↗</span><p className="mt-3 font-bold">{error ? "Your checklist will appear here." : "A fresh start for your next big idea."}</p><p className="mt-2 text-sm text-ink/65">{error ? "Reconnect to the API to get started." : "Add your first task above. Every launch starts somewhere."}</p></div> : (
              <ul className="divide-y-2 divide-ink/15">
                {tasks.map((task, index) => (
                  <li key={task.id} className={`flex items-center gap-3 px-5 py-5 sm:gap-4 sm:px-6 ${task.done ? "bg-mint/20" : ""}`}>
                    <input type="checkbox" checked={task.done} disabled={disabled} onChange={() => void mutate(`/api/tasks/${task.id}/toggle`, "PATCH")} aria-label={`Mark ${task.title} ${task.done ? "incomplete" : "done"}`} className="size-6 shrink-0 cursor-pointer accent-teal" />
                    <span className="hidden text-xs font-bold text-ink/40 sm:block">{String(index + 1).padStart(2, "0")}</span>
                    <span className={`min-w-0 flex-1 break-words text-sm font-bold sm:text-base ${task.done ? "text-ink/50 line-through" : ""}`}>{task.title}</span>
                    <button type="button" disabled={disabled} onClick={() => void mutate(`/api/tasks/${task.id}`, "DELETE")} aria-label={`Delete ${task.title}`} className="flex size-10 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-red-50 hover:text-red-800">
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t-2 border-ink bg-cream/60 px-5 py-3 text-xs text-ink/65 sm:px-6">
            <span>{stats && !loading ? stats.total > 0 && stats.remaining === 0 ? "All systems go. You’re ready to launch!" : `${stats.remaining} ${stats.remaining === 1 ? "step" : "steps"} closer to liftoff.` : "One task at a time."}</span>
            <button type="button" disabled={disabled} onClick={() => void load()} className="shrink-0 font-bold text-teal underline underline-offset-4">Refresh ↻</button>
          </div>
        </section>
        <p className="mt-8 text-center text-xs font-bold tracking-wide text-teal">LESS OVERTHINKING. MORE LAUNCHING.</p>
      </main>

      <footer className="flex flex-col justify-between gap-3 border-t-2 border-ink py-6 text-xs text-ink/65 sm:flex-row">
        <p className="font-bold">Built for the countdown.</p>
        <p className="break-all">API URL: <span className="font-mono text-teal">{API_URL}</span></p>
      </footer>
    </div>
  );
}
