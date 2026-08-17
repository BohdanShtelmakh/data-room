import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FolderPlus,
  LogOut,
  Search,
  Share2,
} from "lucide-react";
import { FileTable } from "../components/FileTable";
import { PreviewModal } from "../components/PreviewModal";
import { ShareDialog } from "../components/ShareDialog";
import { UploadPanel } from "../components/UploadPanel";
import { ActionDialog, type DialogState } from "../components/ActionDialog";
import { ToastRegion, type Toast } from "../components/ToastRegion";
import { api } from "../lib/api";
import { formatBytes } from "../lib/format";
import { useFileUploads } from "../hooks/useFileUploads";
import type {
  DataFile,
  Folder,
  FolderContent,
  Preview,
  ShareResourceType,
  User,
} from "../types/domain";

export function DataRoomPage({
  user,
  onLogout,
  onOpenShared,
}: {
  user: User;
  onLogout: () => void;
  onOpenShared: () => void;
}) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [content, setContent] = useState<FolderContent | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [dataRoomName, setDataRoomName] = useState("My Data Room");
  const [dataRoomId, setDataRoomId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    type: ShareResourceType;
    id: string;
    name: string;
  } | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "type" | "size">("name");
  const [fileFilter, setFileFilter] = useState("all");
  const [history, setHistory] = useState<Array<string | null>>([null]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const notify = (message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      3000,
    );
  };

  const loadFolders = async () => {
    const next = await api<Folder[]>("/folder");
    setFolders(next);
  };

  const loadContent = async (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setContent(
      folderId ? await api<FolderContent>(`/folder/${folderId}/content`) : null,
    );
  };

  const navigateFolder = (folderId: string | null) => {
    const next = history.slice(0, historyIndex + 1);
    next.push(folderId);
    setHistory(next);
    setHistoryIndex(next.length - 1);
    void loadContent(folderId);
  };

  const moveHistory = (offset: number) => {
    const index = historyIndex + offset;
    if (index < 0 || index >= history.length) return;
    setHistoryIndex(index);
    void loadContent(history[index]);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [nextFolders, rooms] = await Promise.all([
          api<Folder[]>("/folder"),
          api<Array<{ id: string; name: string }>>("/data-room"),
        ]);
        setFolders(nextFolders);
        setDataRoomName(rooms[0]?.name ?? "My Data Room");
        setDataRoomId(rooms[0]?.id ?? "");
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Unable to load data room",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const run = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshCurrent = async () => {
    await Promise.all([loadFolders(), loadContent(currentFolderId)]);
  };

  const fileUploads = useFileUploads({
    folderId: currentFolderId,
    setDialog,
    notify,
    onError: setError,
    onContentChange: loadContent,
  });

  const breadcrumbs = useMemo(() => {
    const result: Folder[] = [];
    let folder = folders.find((item) => item.id === currentFolderId);
    while (folder) {
      result.unshift(folder);
      folder = folder.parentId
        ? folders.find((item) => item.id === folder?.parentId)
        : undefined;
    }
    return result;
  }, [currentFolderId, folders]);

  const createFolder = () => {
    setDialog({
      title: "Create folder",
      label: "Folder name",
      confirmLabel: "Create",
      onConfirm: (name) =>
        void run(async () => {
          await api("/folder", {
            method: "POST",
            body: JSON.stringify({
              name,
              parentId: currentFolderId ?? undefined,
            }),
          });
          await refreshCurrent();
          notify("Folder created");
        }),
    });
  };

  const renameFolder = (folder: Folder) => {
    setDialog({
      title: "Rename folder",
      label: "Folder name",
      initialValue: folder.name,
      confirmLabel: "Rename",
      onConfirm: (name) => {
        if (name === folder.name) return;
        void run(async () => {
          await api(`/folder/${folder.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
          });
          await refreshCurrent();
          notify("Folder renamed");
        });
      },
    });
  };

  const deleteFolder = (folder: Folder) =>
    void run(async () => {
      const impact = await api<{
        folderCount: number;
        fileCount: number;
        totalSize: number;
      }>(`/folder/${folder.id}/deletion-impact`);
      setDialog({
        title: `Delete ${folder.name}?`,
        description: `This deletes ${impact.folderCount} folder${impact.folderCount === 1 ? "" : "s"} and ${impact.fileCount} file${impact.fileCount === 1 ? "" : "s"} (${formatBytes(impact.totalSize)}). This action cannot be undone.`,
        confirmLabel: "Delete folder",
        destructive: true,
        onConfirm: () =>
          void run(async () => {
            await api(`/folder/${folder.id}`, { method: "DELETE" });
            await refreshCurrent();
            notify("Folder deleted");
          }),
      });
    });

  const renameFile = (file: DataFile) => {
    setDialog({
      title: "Rename file",
      label: "File name",
      initialValue: file.name,
      confirmLabel: "Rename",
      onConfirm: (name) => {
        if (name === file.name) return;
        void run(async () => {
          await api(`/file/${file.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
          });
          await loadContent(currentFolderId);
          notify("File renamed");
        });
      },
    });
  };

  const moveFile = (file: DataFile, folderId: string) => {
    if (folderId === file.folderId) return;
    void run(async () => {
      await api(`/file/${file.id}`, {
        method: "PATCH",
        body: JSON.stringify({ folderId }),
      });
      await loadContent(currentFolderId);
    });
  };

  const deleteFile = (file: DataFile) => {
    setDialog({
      title: `Delete ${file.name}?`,
      description: "This action cannot be undone.",
      confirmLabel: "Delete file",
      destructive: true,
      onConfirm: () =>
        void run(async () => {
          await api(`/file/${file.id}`, { method: "DELETE" });
          await loadContent(currentFolderId);
          notify("File deleted");
        }),
    });
  };

  const downloadFile = (file: DataFile) =>
    void run(async () => {
      const blob = await api<Blob>(`/file/${file.id}/download`, {}, "blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    });

  const previewFile = (file: DataFile) =>
    void run(async () => {
      const blob = await api<Blob>(`/file/${file.id}/preview`, {}, "blob");
      const isText =
        blob.type.startsWith("text/") ||
        blob.type === "application/json" ||
        blob.type === "application/xml" ||
        blob.type.endsWith("+json") ||
        blob.type.endsWith("+xml");
      const next: Preview = isText
        ? { name: file.name, mimeType: blob.type, text: await blob.text() }
        : {
            name: file.name,
            mimeType: blob.type,
            url: URL.createObjectURL(blob),
          };
      setPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return next;
      });
    });

  const closePreview = () =>
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center text-sm text-zinc-500">
        Loading…
      </main>
    );

  const visibleFolders = content
    ? content.folders
    : folders.filter((folder) => !folder.parentId);
  const visibleFiles = content?.files ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const shownFolders = visibleFolders
    .filter((folder) => folder.name.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => a.name.localeCompare(b.name));
  const shownFiles = visibleFiles
    .filter((file) => file.name.toLowerCase().includes(normalizedQuery))
    .filter(
      (file) =>
        fileFilter === "all" ||
        file.mimeType.startsWith(`${fileFilter}/`) ||
        (fileFilter === "document" &&
          (file.mimeType.startsWith("text/") ||
            file.mimeType === "application/pdf")),
    )
    .sort((a, b) =>
      sort === "size"
        ? a.size - b.size
        : sort === "type"
          ? a.mimeType.localeCompare(b.mimeType)
          : a.name.localeCompare(b.name),
    );
  const previewIndex = preview
    ? visibleFiles.findIndex((file) => file.name === preview.name)
    : -1;
  const previewedFile =
    previewIndex >= 0 ? visibleFiles[previewIndex] : undefined;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-base font-semibold">{dataRoomName}</h1>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="button secondary" onClick={onOpenShared}>
              Shared with me
            </button>
            <button
              className="icon-button"
              onClick={onLogout}
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <nav
            className="flex min-w-0 items-center text-sm"
            aria-label="Folder path"
          >
            <button className="breadcrumb" onClick={() => navigateFolder(null)}>
              {dataRoomName}
            </button>
            {breadcrumbs.map((folder) => (
              <span className="flex min-w-0 items-center" key={folder.id}>
                <ChevronRight
                  className="mx-1 shrink-0 text-zinc-400"
                  size={15}
                />
                <button
                  className="breadcrumb truncate"
                  onClick={() => navigateFolder(folder.id)}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="button secondary"
              onClick={() =>
                setShareTarget({
                  type: "DATAROOM",
                  id: dataRoomId,
                  name: dataRoomName,
                })
              }
              disabled={!dataRoomId}
            >
              <Share2 size={17} /> Share room
            </button>
            <button
              className="button secondary"
              onClick={createFolder}
              disabled={busy}
            >
              <FolderPlus size={17} /> New folder
            </button>
          </div>
        </div>
        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            className="icon-button border border-zinc-200 bg-white"
            onClick={() => moveHistory(-1)}
            disabled={historyIndex === 0}
            title="Back"
          >
            <ArrowLeft size={17} />
          </button>
          <button
            className="icon-button border border-zinc-200 bg-white"
            onClick={() => moveHistory(1)}
            disabled={historyIndex === history.length - 1}
            title="Forward"
          >
            <ArrowRight size={17} />
          </button>
          <label className="flex h-9 min-w-52 flex-1 items-center gap-2 border border-zinc-300 bg-white px-3">
            <Search size={16} className="text-zinc-400" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this folder"
            />
          </label>
          <select
            className="select h-9"
            value={fileFilter}
            onChange={(event) => setFileFilter(event.target.value)}
            aria-label="Filter file type"
          >
            <option value="all">All types</option>
            <option value="document">Documents</option>
            <option value="image">Images</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </select>
          <select
            className="select h-9"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            aria-label="Sort resources"
          >
            <option value="name">Sort: Name</option>
            <option value="type">Sort: Type</option>
            <option value="size">Sort: Size</option>
          </select>
        </div>
        {currentFolderId && (
          <UploadPanel
            items={fileUploads.uploads}
            onFiles={fileUploads.receiveFiles}
            onRetry={fileUploads.retry}
            onRename={fileUploads.rename}
            onRemove={fileUploads.remove}
            onCancel={fileUploads.cancel}
            onRetryAll={fileUploads.retryAll}
            onClearFailed={fileUploads.clearFailed}
          />
        )}
        <FileTable
          folders={shownFolders}
          files={shownFiles}
          allFolders={folders}
          onOpenFolder={navigateFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onPreviewFile={previewFile}
          onDownloadFile={downloadFile}
          onRenameFile={renameFile}
          onDeleteFile={deleteFile}
          onMoveFile={moveFile}
          onShareFolder={(folder) =>
            setShareTarget({ type: "FOLDER", id: folder.id, name: folder.name })
          }
          onShareFile={(file) =>
            setShareTarget({ type: "FILE", id: file.id, name: file.name })
          }
        />
      </section>
      {preview && (
        <PreviewModal
          preview={preview}
          file={previewedFile}
          onClose={closePreview}
          onDownload={
            previewedFile ? () => downloadFile(previewedFile) : undefined
          }
          onPrevious={
            previewIndex > 0
              ? () => previewFile(visibleFiles[previewIndex - 1])
              : undefined
          }
          onNext={
            previewIndex >= 0 && previewIndex < visibleFiles.length - 1
              ? () => previewFile(visibleFiles[previewIndex + 1])
              : undefined
          }
        />
      )}
      {shareTarget && (
        <ShareDialog
          resourceType={shareTarget.type}
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
      {dialog && (
        <ActionDialog dialog={dialog} onClose={() => setDialog(null)} />
      )}
      <ToastRegion
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }
      />
    </main>
  );
}
