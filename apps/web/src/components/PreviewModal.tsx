import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { formatBytes } from "../lib/format";
import type { DataFile, Preview } from "../types/domain";

export function PreviewModal({
  preview,
  file,
  onClose,
  onDownload,
  onPrevious,
  onNext,
}: {
  preview: Preview;
  file?: DataFile;
  onClose: () => void;
  onDownload?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${preview.name}`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex h-[85vh] w-full max-w-5xl flex-col border border-zinc-300 bg-white">
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">{preview.name}</h2>
            {file && (
              <p className="text-xs text-zinc-500">
                {file.mimeType} · {formatBytes(file.size)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onPrevious && (
              <button
                className="icon-button"
                onClick={onPrevious}
                title="Previous file"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {onNext && (
              <button
                className="icon-button"
                onClick={onNext}
                title="Next file"
              >
                <ChevronRight size={18} />
              </button>
            )}
            {onDownload && (
              <button
                className="icon-button"
                onClick={onDownload}
                title="Download"
              >
                <Download size={17} />
              </button>
            )}
            <button
              className="icon-button"
              onClick={onClose}
              title="Close preview"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <PreviewContent preview={preview} />
      </div>
    </div>
  );
}

function PreviewContent({ preview }: { preview: Preview }) {
  if (preview.text !== undefined)
    return (
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words bg-zinc-50 p-5 text-sm">
        {preview.text}
      </pre>
    );
  if (preview.mimeType.startsWith("image/"))
    return (
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-zinc-100 p-4">
        <img
          className="max-h-full max-w-full object-contain"
          src={preview.url}
          alt={preview.name}
        />
      </div>
    );
  if (preview.mimeType.startsWith("audio/"))
    return (
      <div className="grid min-h-0 flex-1 place-items-center bg-zinc-100 p-6">
        <audio
          className="w-full max-w-xl"
          src={preview.url}
          controls
          autoPlay
        />
      </div>
    );
  if (preview.mimeType.startsWith("video/"))
    return (
      <div className="grid min-h-0 flex-1 place-items-center overflow-hidden bg-black p-4">
        <video
          className="max-h-full max-w-full"
          src={preview.url}
          controls
          autoPlay
        />
      </div>
    );
  return (
    <iframe
      className="min-h-0 flex-1 bg-zinc-100"
      src={preview.url}
      title={preview.name}
    />
  );
}
