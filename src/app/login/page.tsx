"use client";

import { useState, type FormEvent } from "react";
import { callApi } from "@/lib/client";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await callApi("/api/login", { method: "POST", body: JSON.stringify({ password }) });
      window.location.assign(new URL("/", window.location.origin).href);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold">Algosoup market analyst</h1>
      <p className="mt-2 text-sm text-slate-600">Enter the shared password to continue.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="password"
          aria-label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
          autoFocus
        />
        <button disabled={busy || password.length === 0} className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50">
          {busy ? "Checking..." : "Enter"}
        </button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </form>
    </main>
  );
}
