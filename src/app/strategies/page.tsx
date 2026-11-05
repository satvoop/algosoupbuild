import { Nav } from "@/components/Nav";
import { StrategiesView } from "@/components/StrategiesView";

export default function StrategiesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Nav />
      <h1 className="text-2xl font-semibold">Strategies</h1>
      <p className="mt-1 text-sm text-slate-600">Stored analysis methods. Every run keeps the exact prompt it used.</p>
      <StrategiesView />
    </main>
  );
}
