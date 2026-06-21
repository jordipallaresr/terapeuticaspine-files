import { listFolders } from "@/lib/r2";
import { FolderBrowser } from "@/components/folder-browser";

// The data comes from the R2 binding at request time: dynamic render.
export const dynamic = "force-dynamic";

export default async function Home() {
  const folders = await listFolders();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
        <p className="text-sm text-muted-foreground">
          Busca un paciente y haz clic para descargar sus imágenes.
        </p>
      </div>
      <FolderBrowser folders={folders} />
    </div>
  );
}
