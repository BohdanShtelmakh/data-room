import { useEffect, useState } from "react";
import { PreviewModal } from "../components/PreviewModal";
import { ReadOnlyFileBrowser } from "../components/ReadOnlyFileBrowser";
import { api } from "../lib/api";
import type { DataFile, Folder, FolderContent, Preview } from "../types/domain";
import { makePreview, saveBlob } from "../lib/blob";

type PublicResource = {
  kind: "DATAROOM" | "FOLDER" | "FILE";
  id?: string;
  name?: string;
  folder?: Pick<Folder, "id" | "name">;
  folders?: Folder[];
  files?: DataFile[];
} & Partial<DataFile>;

export function PublicSharePage({ token }: { token: string }) {
  const [resource, setResource] = useState<PublicResource | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api<{ resource: PublicResource }>(`/share/public/${token}`)
      .then(({ resource }) => {
        setResource(resource);
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Share link is unavailable",
        ),
      );
  }, [token]);
  const openFolder = (id: string) =>
    api<FolderContent>(`/share/public/${token}/folder/${id}`);
  const previewFile = (file: DataFile) =>
    void api<Blob>(`/share/public/${token}/file/${file.id}/preview`, {}, "blob")
      .then(async (blob) => setPreview(await makePreview(file.name, blob)))
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to preview file",
        ),
      );
  const downloadFile = (file: DataFile) =>
    void api<Blob>(
      `/share/public/${token}/file/${file.id}/download`,
      {},
      "blob",
    ).then((blob) => saveBlob(file.name, blob));
  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  const folders = resource?.folders ?? [];
  const files =
    resource?.kind === "FILE"
      ? [resource as DataFile]
      : (resource?.files ?? []);
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <div>
            <h1 className="font-semibold">
              {resource?.name ?? resource?.folder?.name ?? "Shared resource"}
            </h1>
            <p className="text-xs text-zinc-500">Public read-only share</p>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error ? (
          <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : !resource ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <ReadOnlyFileBrowser
            key={resource.id ?? resource.folder?.id ?? token}
            rootName={
              resource.name ?? resource.folder?.name ?? "Shared resource"
            }
            initialFolders={folders}
            initialFiles={files}
            loadFolder={openFolder}
            onPreviewFile={previewFile}
            onDownloadFile={downloadFile}
          />
        )}
      </section>
      {preview && <PreviewModal preview={preview} onClose={closePreview} />}
    </main>
  );
}
