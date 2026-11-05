import Link from "next/link";

export function Nav() {
  return (
    <nav className="mb-8 flex gap-6 border-b border-slate-200 pb-3 text-sm font-medium">
      <Link href="/" className="hover:underline">Markets</Link>
      <Link href="/watchlist" className="hover:underline">Watchlist</Link>
      <Link href="/strategies" className="hover:underline">Strategies</Link>
    </nav>
  );
}
