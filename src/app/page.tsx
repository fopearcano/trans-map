import { AtlasApp } from "@/components/atlas/AtlasApp";
import { getRepository, DatabaseNotReadyError } from "@/server/repository";
import { parseAtlasState } from "@/lib/urlState";

// Always read the current database (editorial changes appear without a rebuild).
export const dynamic = "force-dynamic";

export default async function AtlasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  try {
    const repo = getRepository();
    const atlas = repo.getAtlasIndex();
    const relations = repo.getRelations();
    const tags = repo.getDataset().tags;
    return <AtlasApp atlas={atlas} relations={relations} tags={tags} initial={parseAtlasState(params)} />;
  } catch (err) {
    if (err instanceof DatabaseNotReadyError)
      return (
        <main className="mx-auto max-w-xl p-8">
          <h1 className="text-xl font-semibold">TRANS-MAP</h1>
          <p className="mt-4">Il database non è ancora pronto. Esegui:</p>
          <pre className="mt-2 rounded bg-surface-2 p-3 text-sm">npm run db:setup</pre>
        </main>
      );
    throw err;
  }
}
