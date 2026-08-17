import { ArrowLeft, File as FileIcon, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { PreviewModal } from "../components/PreviewModal";
import { ReadOnlyFileBrowser } from "../components/ReadOnlyFileBrowser";
import { api } from "../lib/api";
import { makePreview, saveBlob } from "../lib/blob";
import type {
  DataFile,
  FolderContent,
  Preview,
  ReceivedShare,
} from "../types/domain";

export function SharedPage({ onBack }: { onBack: () => void }) {
  const [shares, setShares] = useState<ReceivedShare[]>([]);
  const [selected, setSelected] = useState<ReceivedShare | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api<ReceivedShare[]>("/share/received")
      .then(setShares)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load shares",
        ),
      );
  }, []);

  const openShare = (share: ReceivedShare) => {
    if (!share.resource) return;
    if (share.resourceType === "FILE")
      return previewFile(share.resource as DataFile);
    if (share.resourceType === "FOLDER") {
      void openFolder(share.resourceId)
        .then((content) =>
          setSelected({
            ...share,
            resource: {
              ...share.resource!,
              folders: content.folders,
              files: content.files,
            },
          }),
        )
        .catch((reason: unknown) =>
          setError(
            reason instanceof Error ? reason.message : "Unable to open folder",
          ),
        );
      return;
    }
    setSelected(share);
  };
  const openFolder = async (id: string) =>
    api<FolderContent>(`/folder/${id}/content`);
  const previewFile = (file: DataFile) =>
    void api<Blob>(`/file/${file.id}/preview`, {}, "blob")
      .then(async (blob) => setPreview(await makePreview(file.name, blob)))
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to preview file",
        ),
      );
  const downloadFile = (file: DataFile) =>
    void api<Blob>(`/file/${file.id}/download`, {}, "blob").then((blob) =>
      saveBlob(file.name, blob),
    );
  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button className="icon-button" onClick={onBack} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-semibold">Shared with me</h1>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error && (
          <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {selected?.resource ? (
          <>
            <button
              className="mb-4 text-sm font-medium hover:underline"
              onClick={() => setSelected(null)}
            >
              All shared resources
            </button>
            <ReadOnlyFileBrowser
              key={selected.id}
              rootName={selected.resource.name}
              initialFolders={selected.resource.folders ?? []}
              initialFiles={selected.resource.files ?? []}
              loadFolder={openFolder}
              onPreviewFile={previewFile}
              onDownloadFile={downloadFile}
            />
          </>
        ) : (
          <div className="divide-y divide-zinc-100 border border-zinc-200 bg-white">
            {shares.map((share) => (
              <button
                className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-zinc-50"
                key={share.id}
                onClick={() => openShare(share)}
              >
                {share.resourceType === "FILE" ? (
                  <FileIcon size={18} />
                ) : (
                  <Folder size={18} />
                )}
                <span className="flex-1">
                  <strong className="block text-sm">
                    {share.resource?.name ?? "Unavailable"}
                  </strong>
                  <span className="text-xs text-zinc-500">
                    {share.resourceType.toLowerCase()} shared by{" "}
                    {share.createdBy.email}
                  </span>
                </span>
                <span className="text-xs font-medium text-zinc-500">
                  Read only
                </span>
              </button>
            ))}
            {!shares.length && (
              <p className="p-10 text-center text-sm text-zinc-500">
                Nothing has been shared with you
              </p>
            )}
          </div>
        )}
      </section>
      {preview && <PreviewModal preview={preview} onClose={closePreview} />}
    </main>
  );
}
