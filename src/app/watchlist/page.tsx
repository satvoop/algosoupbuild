import { Nav } from "@/components/Nav";
import { WatchlistView } from "@/components/WatchlistView";

export default function WatchlistPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Nav />
      <h1 className="text-2xl font-semibold">Watchlist</h1>
      <WatchlistView />
    </main>
  );
}
