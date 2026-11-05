import { Nav } from "@/components/Nav";
import { ItemView } from "@/components/ItemView";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Nav />
      <ItemView id={id} />
    </main>
  );
}
