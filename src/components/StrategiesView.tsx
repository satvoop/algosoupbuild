"use client";

import { useCallback, useEffect, useState } from "react";
import { callApi } from "@/lib/client";
import { StrategyForm, type StrategyDraft } from "@/components/StrategyForm";

interface Strategy { id: string; name: string; description: string | null; prompt_template: string; output_type: "text" | "json"; output_schema: unknown; is_seed: boolean }

const EMPTY: StrategyDraft = { name: "", description: "", promptTemplate: "Market: {{event_title}}\nOptions: {{options}}\nNews ({{article_count}}):\n{{articles}}\n\n", outputType: "text", outputSchema: '{"type":"object","required":[]}' };

function toDraft(strategy: Strategy): StrategyDraft {
  return { id: strategy.id, name: strategy.name, description: strategy.description ?? "", promptTemplate: strategy.prompt_template, outputType: strategy.output_type, outputSchema: strategy.output_schema ? JSON.stringify(strategy.output_schema, null, 2) : EMPTY.outputSchema };
}

export function StrategiesView() {
  const [strategies, setStrategies] = useState<Strategy[] | null>(null);
  const [editing, setEditing] = useState<StrategyDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStrategies((await callApi<{ strategies: Strategy[] }>("/api/strategies")).strategies);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load strategies");
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function save(draft: StrategyDraft) {
    setError(null);
    try {
      await callApi(draft.id ? `/api/strategies/${draft.id}` : "/api/strategies", { method: draft.id ? "PUT" : "POST", body: JSON.stringify(draft) });
      setEditing(null);
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save");
    }
  }

  async function archive(strategy: Strategy) {
    if (!window.confirm(`Archive "${strategy.name}"? It leaves the menu; its past runs are kept.`)) return;
    try {
      await callApi(`/api/strategies/${strategy.id}`, { method: "DELETE" });
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not archive");
    }
  }

  return (
    <section className="mt-6">
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {editing ? <StrategyForm key={editing.id ?? "new"} initial={editing} onSave={save} onCancel={() => setEditing(null)} /> : (
        <button onClick={() => setEditing(EMPTY)} className="rounded bg-slate-900 px-3 py-1 text-sm text-white">New strategy</button>
      )}
      {!strategies && <p className="mt-4 text-sm text-slate-500">Loading...</p>}
      <ul className="mt-6 flex flex-col gap-3">
        {strategies?.map((strategy) => (
          <li key={strategy.id} className="rounded border border-slate-200 p-4">
            <div className="flex justify-between">
              <span className="font-medium">{strategy.name} <span className="text-xs text-slate-500">({strategy.output_type}{strategy.is_seed ? ", starter" : ""})</span></span>
              <span className="flex gap-3 text-sm">
                <button onClick={() => setEditing(toDraft(strategy))} className="underline">Edit</button>
                <button onClick={() => archive(strategy)} className="underline">Archive</button>
              </span>
            </div>
            {strategy.description && <p className="mt-1 text-sm text-slate-600">{strategy.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
