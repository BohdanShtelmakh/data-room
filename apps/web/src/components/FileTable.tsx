import {
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder as FolderIcon,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { formatBytes } from "../lib/format";
import type { DataFile, Folder } from "../types/domain";

type Props = {
  folders: Folder[];
  files: DataFile[];
  allFolders: Folder[];
  onOpenFolder: (id: string) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onPreviewFile: (file: DataFile) => void;
  onDownloadFile: (file: DataFile) => void;
  onRenameFile: (file: DataFile) => void;
  onDeleteFile: (file: DataFile) => void;
  onMoveFile: (file: DataFile, folderId: string) => void;
  readOnly?: boolean;
  onShareFolder?: (folder: Folder) => void;
  onShareFile?: (file: DataFile) => void;
};

export function FileTable(props: Props) {
  return (
    <>
      <div className="border border-zinc-200 bg-white md:hidden">
        {[
          ...props.folders.map((folder) => ({
            kind: "folder" as const,
            folder,
          })),
          ...props.files.map((file) => ({ kind: "file" as const, file })),
        ].map((item) =>
          item.kind === "folder" ? (
            <div
              className="flex items-center gap-3 border-b border-zinc-100 p-3"
              key={item.folder.id}
            >
              <FolderIcon size={20} className="shrink-0 text-amber-500" />
              <button
                className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                onClick={() => props.onOpenFolder(item.folder.id)}
              >
                {item.folder.name}
              </button>
              {props.readOnly ? (
                <span className="text-xs text-zinc-500">Shared</span>
              ) : (
                <>
                  <Action
                    title="Share folder"
                    onClick={() => props.onShareFolder?.(item.folder)}
                  >
                    <Share2 size={16} />
                  </Action>
                  <Action
                    title="Rename folder"
                    onClick={() => props.onRenameFolder(item.folder)}
                  >
                    <Pencil size={16} />
                  </Action>
                  <Action
                    title="Delete folder"
                    danger
                    onClick={() => props.onDeleteFolder(item.folder)}
                  >
                    <Trash2 size={16} />
                  </Action>
                </>
              )}
            </div>
          ) : (
            <div className="border-b border-zinc-100 p-3" key={item.file.id}>
              <div className="flex items-center gap-3">
                <FileTypeIcon file={item.file} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(item.file.size)} · {item.file.mimeType}
                  </p>
                </div>
                <Action
                  title="Preview file"
                  onClick={() => props.onPreviewFile(item.file)}
                >
                  <Eye size={16} />
                </Action>
                <Action
                  title="Download file"
                  onClick={() => props.onDownloadFile(item.file)}
                >
                  <Download size={16} />
                </Action>
              </div>
              {!props.readOnly && (
                <div className="mt-2 flex justify-end gap-1">
                  <Action
                    title="Share file"
                    onClick={() => props.onShareFile?.(item.file)}
                  >
                    <Share2 size={16} />
                  </Action>
                  <Action
                    title="Rename file"
                    onClick={() => props.onRenameFile(item.file)}
                  >
                    <Pencil size={16} />
                  </Action>
                  <Action
                    title="Delete file"
                    danger
                    onClick={() => props.onDeleteFile(item.file)}
                  >
                    <Trash2 size={16} />
                  </Action>
                </div>
              )}
            </div>
          ),
        )}
        {!props.folders.length && !props.files.length && (
          <p className="p-10 text-center text-sm text-zinc-500">
            This folder is empty
          </p>
        )}
      </div>
      <div className="hidden overflow-x-auto border border-zinc-200 bg-white md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Location</th>
              <th className="w-40 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {props.folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                onOpen={props.onOpenFolder}
                onRename={props.onRenameFolder}
                onDelete={props.onDeleteFolder}
                onShare={props.onShareFolder}
                readOnly={props.readOnly}
              />
            ))}
            {props.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                folders={props.allFolders}
                onPreview={props.onPreviewFile}
                onDownload={props.onDownloadFile}
                onRename={props.onRenameFile}
                onDelete={props.onDeleteFile}
                onMove={props.onMoveFile}
                onShare={props.onShareFile}
                readOnly={props.readOnly}
              />
            ))}
            {!props.folders.length && !props.files.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-16 text-center text-zinc-500"
                >
                  This folder is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FolderRow({
  folder,
  onOpen,
  onRename,
  onDelete,
  onShare,
  readOnly,
}: {
  folder: Folder;
  onOpen: (id: string) => void;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onShare?: (folder: Folder) => void;
  readOnly?: boolean;
}) {
  return (
    <tr className="hover:bg-zinc-50">
      <td className="px-4 py-3">
        <button
          className="flex items-center gap-2 font-medium hover:underline"
          onClick={() => onOpen(folder.id)}
        >
          <FolderIcon size={18} className="text-amber-500" />
          {folder.name}
        </button>
      </td>
      <td className="px-4 py-3 text-zinc-500">Folder</td>
      <td className="px-4 py-3 text-zinc-400">—</td>
      <td className="px-4 py-3 text-zinc-400">—</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {readOnly ? (
            <span className="text-xs font-medium text-zinc-500">Shared</span>
          ) : (
            <>
              <Action title="Share folder" onClick={() => onShare?.(folder)}>
                <Share2 size={16} />
              </Action>
              <Action title="Rename folder" onClick={() => onRename(folder)}>
                <Pencil size={16} />
              </Action>
            </>
          )}
          <Action title="Delete folder" danger onClick={() => onDelete(folder)}>
            <Trash2 size={16} />
          </Action>
        </div>
      </td>
    </tr>
  );
}

function FileRow({
  file,
  folders,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onMove,
  onShare,
  readOnly,
}: {
  file: DataFile;
  folders: Folder[];
  onPreview: (file: DataFile) => void;
  onDownload: (file: DataFile) => void;
  onRename: (file: DataFile) => void;
  onDelete: (file: DataFile) => void;
  onMove: (file: DataFile, folderId: string) => void;
  onShare?: (file: DataFile) => void;
  readOnly?: boolean;
}) {
  return (
    <tr className="hover:bg-zinc-50">
      <td className="px-4 py-3">
        <span className="flex items-center gap-2 font-medium">
          <FileTypeIcon file={file} />
          {file.name}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-500">{file.mimeType}</td>
      <td className="px-4 py-3 text-zinc-500">{formatBytes(file.size)}</td>
      <td className="px-4 py-3">
        {readOnly ? (
          <span className="text-xs font-medium text-zinc-500">Shared</span>
        ) : (
          <select
            className="select"
            value={file.folderId}
            onChange={(event) => onMove(file, event.target.value)}
            aria-label={`Move ${file.name}`}
          >
            <option value={file.folderId}>Current folder</option>
            {folders
              .filter((folder) => folder.id !== file.folderId)
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Action title="Preview file" onClick={() => onPreview(file)}>
            <Eye size={16} />
          </Action>
          <Action title="Download file" onClick={() => onDownload(file)}>
            <Download size={16} />
          </Action>
          {!readOnly && (
            <>
              <Action title="Share file" onClick={() => onShare?.(file)}>
                <Share2 size={16} />
              </Action>
              <Action title="Rename file" onClick={() => onRename(file)}>
                <Pencil size={16} />
              </Action>
              <Action title="Delete file" danger onClick={() => onDelete(file)}>
                <Trash2 size={16} />
              </Action>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function FileTypeIcon({ file }: { file: DataFile }) {
  const mime = file.mimeType.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/"))
    return <FileImage size={18} className="shrink-0 text-sky-600" />;
  if (mime.startsWith("audio/"))
    return <FileAudio size={18} className="shrink-0 text-violet-600" />;
  if (mime.startsWith("video/"))
    return <FileVideo size={18} className="shrink-0 text-rose-600" />;
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    ["xls", "xlsx", "csv", "ods"].includes(extension)
  )
    return <FileSpreadsheet size={18} className="shrink-0 text-emerald-600" />;
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(extension)
  )
    return <FileArchive size={18} className="shrink-0 text-amber-600" />;
  if (
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    [
      "ts",
      "tsx",
      "js",
      "jsx",
      "html",
      "css",
      "py",
      "java",
      "go",
      "rs",
    ].includes(extension)
  )
    return <FileCode size={18} className="shrink-0 text-cyan-700" />;
  if (
    mime === "application/pdf" ||
    mime.startsWith("text/") ||
    ["doc", "docx", "odt", "rtf", "md", "txt"].includes(extension)
  )
    return <FileText size={18} className="shrink-0 text-blue-700" />;
  return <File size={18} className="shrink-0 text-zinc-400" />;
}

function Action({
  title,
  danger,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`icon-button${danger ? " danger" : ""}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
