import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { DataFile, Folder, FolderContent } from "../types/domain";
import { FileTable } from "./FileTable";

type TrailItem = { id: string; name: string };

export function ReadOnlyFileBrowser({
  rootName,
  initialFolders,
  initialFiles,
  loadFolder,
  onPreviewFile,
  onDownloadFile,
}: {
  rootName: string;
  initialFolders: Folder[];
  initialFiles: DataFile[];
  loadFolder: (id: string) => Promise<FolderContent>;
  onPreviewFile: (file: DataFile) => void;
  onDownloadFile: (file: DataFile) => void;
}) {
  const [content, setContent] = useState<FolderContent | null>(null);
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [error, setError] = useState("");
  const noop = () => undefined;

  const openFolder = async (id: string, nextTrail?: TrailItem[]) => {
    setError("");
    try {
      const next = await loadFolder(id);
      setContent(next);
      setTrail(
        nextTrail ?? [...trail, { id: next.folder.id, name: next.folder.name }],
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to open folder",
      );
    }
  };

  const openBreadcrumb = (index: number) => {
    if (index < 0) {
      setContent(null);
      setTrail([]);
      setError("");
      return;
    }
    const target = trail[index];
    void openFolder(target.id, trail.slice(0, index + 1));
  };

  return (
    <>
      <nav
        className="mb-4 flex min-w-0 items-center gap-1 text-sm"
        aria-label="Shared folder path"
      >
        <button
          className="icon-button mr-1"
          disabled={trail.length === 0}
          onClick={() => openBreadcrumb(trail.length - 2)}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft size={17} />
        </button>
        <button className="breadcrumb" onClick={() => openBreadcrumb(-1)}>
          {rootName}
        </button>
        {trail.map((folder, index) => (
          <span className="flex min-w-0 items-center" key={folder.id}>
            <ChevronRight className="shrink-0 text-zinc-400" size={15} />
            <button
              className="breadcrumb truncate"
              onClick={() => openBreadcrumb(index)}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <FileTable
        folders={content?.folders ?? initialFolders}
        files={content?.files ?? initialFiles}
        allFolders={[]}
        readOnly
        onOpenFolder={(id) => void openFolder(id)}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        onPreviewFile={onPreviewFile}
        onDownloadFile={onDownloadFile}
        onRenameFile={noop}
        onDeleteFile={noop}
        onMoveFile={noop}
      />
    </>
  );
}
