import { Nav } from "@/components/Nav";
import { MarketsList } from "@/components/MarketsList";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Nav />
      <h1 className="text-2xl font-semibold">Top 10 Polymarket events by volume</h1>
      <p className="mt-1 text-sm text-slate-600">Live from Polymarket when you load. Not stored.</p>
      <MarketsList />
    </main>
  );
}
