/** Renders a strategy's JSON output as readable text: arrays of objects become cards, keys become labels. */
function label(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (first) => first.toUpperCase());
}

function Value({ name, value }: { name: string; value: unknown }) {
  if (value === null || value === undefined) return <span className="text-slate-400">-</span>;
  if (typeof value === "number") {
    return <span>{name === "price" && value <= 1 ? `${Math.round(value * 1000) / 10}%` : value}</span>;
  }
  if (typeof value === "string" || typeof value === "boolean") return <span className="whitespace-pre-wrap">{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry !== "object" || entry === null)) return <span>{value.join(", ")}</span>;
    return <div className="mt-1 flex flex-col gap-2">{value.map((entry, index) => <Fields key={index} data={entry} />)}</div>;
  }
  return <Fields data={value} />;
}

function Fields({ data }: { data: unknown }) {
  if (typeof data !== "object" || data === null) return <Value name="" value={data} />;
  const entries = Object.entries(data as Record<string, unknown>);
  const title = entries.find(([key]) => key === "option");
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      {title && <p className="font-medium">{String(title[1])}</p>}
      <dl className="mt-1 flex flex-col gap-1 text-sm">
        {entries.filter(([key]) => key !== "option").map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label(key)}</dt>
            <dd><Value name={key} value={value} /></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function JsonResult({ data }: { data: unknown }) {
  return (
    <div className="mt-2">
      <Fields data={data} />
      <details className="mt-2 text-xs text-slate-500">
        <summary>Raw JSON</summary>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}
