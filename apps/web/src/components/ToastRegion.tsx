import { CheckCircle2, X } from "lucide-react";

export type Toast = { id: string; message: string };

export function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          className="flex items-center gap-3 border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg"
          key={toast.id}
        >
          <CheckCircle2 size={17} className="shrink-0 text-green-600" />
          <span className="flex-1">{toast.message}</span>
          <button
            className="icon-button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
