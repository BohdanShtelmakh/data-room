import {
  Check,
  Pencil,
  RotateCcw,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

export type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  file: File;
  controller?: AbortController;
};

export function UploadPanel({
  items,
  disabled,
  onFiles,
  onRetry,
  onRename,
  onRemove,
  onCancel,
  onRetryAll,
  onClearFailed,
}: {
  items: UploadItem[];
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onRetry: (item: UploadItem) => void;
  onRename: (item: UploadItem) => void;
  onRemove: (id: string) => void;
  onCancel: (item: UploadItem) => void;
  onRetryAll: () => void;
  onClearFailed: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const active = items.filter((item) => item.status === "uploading");
  const failed = items.filter((item) => item.status === "error");
  const overall = active.length
    ? Math.round(
        active.reduce((sum, item) => sum + item.progress, 0) / active.length,
      )
    : 0;
  const receive = (files: FileList | null) => {
    if (!disabled && files?.length) onFiles(Array.from(files));
    if (input.current) input.current.value = "";
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    receive(event.dataTransfer.files);
  };
  return (
    <section className="mb-5 border border-zinc-200 bg-white">
      <button
        type="button"
        className={`flex w-full items-center justify-center gap-3 border-b border-dashed px-4 py-7 text-sm transition-colors ${dragging ? "bg-zinc-100" : "hover:bg-zinc-50"}`}
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <UploadCloud size={21} className="text-zinc-500" />
        <span>
          <strong>Drop files here</strong>
          <span className="mx-2 text-zinc-300">|</span>
          <span className="text-zinc-500">or click to upload</span>
          <span className="ml-2 text-xs text-zinc-400">
            Up to 5 files, 10 MB each
          </span>
        </span>
      </button>
      <input
        ref={input}
        className="hidden"
        type="file"
        multiple
        onChange={(event) => receive(event.target.files)}
      />
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
            <span>
              {active.length
                ? `${active.length} uploading · ${overall}% overall`
                : `${failed.length} failed`}
            </span>
            {failed.length > 0 && (
              <span className="flex gap-3">
                <button
                  className="font-medium text-zinc-700 hover:underline"
                  onClick={onRetryAll}
                >
                  Retry all
                </button>
                <button
                  className="font-medium text-zinc-700 hover:underline"
                  onClick={onClearFailed}
                >
                  Clear failed
                </button>
              </span>
            )}
          </div>
          <div className="divide-y divide-zinc-100">
            {items.map((item) => (
              <div
                className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-4 px-4 py-3"
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{item.name}</span>
                    {item.status === "done" ? (
                      <Check size={16} className="shrink-0 text-green-600" />
                    ) : item.status === "error" ? (
                      <XCircle size={16} className="shrink-0 text-red-600" />
                    ) : null}
                  </div>
                  <div className="h-1.5 overflow-hidden bg-zinc-100">
                    <div
                      className={`h-full transition-[width] ${item.status === "error" ? "bg-red-500" : item.status === "done" ? "bg-green-600" : "bg-zinc-800"}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && (
                    <p className="mt-1 text-xs text-red-600">{item.error}</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {item.status === "error" ? (
                    <>
                      <button
                        className="icon-button"
                        title="Retry upload"
                        onClick={() => onRetry(item)}
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        className="icon-button"
                        title="Rename and retry"
                        onClick={() => onRename(item)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button danger"
                        title="Remove"
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  ) : item.status === "uploading" ? (
                    <>
                      <span className="text-right text-sm tabular-nums text-zinc-500">
                        {item.progress}%
                      </span>
                      <button
                        className="icon-button"
                        title="Cancel upload"
                        onClick={() => onCancel(item)}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <span className="text-right text-sm tabular-nums text-zinc-500">
                      {item.progress}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
