"use client";

import { useState, type FormEvent } from "react";
import { PLACEHOLDERS } from "@/lib/strategy/template";

export interface StrategyDraft { id?: string; name: string; description: string; promptTemplate: string; outputType: "text" | "json"; outputSchema: string }

export function StrategyForm({ initial, onSave, onCancel }: { initial: StrategyDraft; onSave: (draft: StrategyDraft) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<StrategyDraft>) => setDraft((current) => ({ ...current, ...patch }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave(draft);
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded border border-slate-300 px-2 py-1 text-sm";
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded border border-slate-300 p-4">
      <label className="text-sm">Name<input className={input} value={draft.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="text-sm">Description<input className={input} value={draft.description} onChange={(e) => set({ description: e.target.value })} /></label>
      <label className="text-sm">Prompt template
        <textarea className={`${input} h-40 font-mono`} value={draft.promptTemplate} onChange={(e) => set({ promptTemplate: e.target.value })} />
      </label>
      <p className="text-xs text-slate-500">Placeholders: {PLACEHOLDERS.map((key) => `{{${key}}}`).join(", ")}. They are filled with the market, its options and Yes prices, and the latest relevant news.</p>
      <label className="text-sm">Output type
        <select className={input} value={draft.outputType} onChange={(e) => set({ outputType: e.target.value === "json" ? "json" : "text" })}>
          <option value="text">Text</option>
          <option value="json">JSON (structured)</option>
        </select>
      </label>
      {draft.outputType === "json" && (
        <label className="text-sm">Output schema (JSON object; keys in &quot;required&quot; are checked on every run)
          <textarea className={`${input} h-24 font-mono`} value={draft.outputSchema} onChange={(e) => set({ outputSchema: e.target.value })} />
        </label>
      )}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50">{busy ? "Saving..." : "Save"}</button>
        <button type="button" onClick={onCancel} className="text-sm underline">Cancel</button>
      </div>
    </form>
  );
}
