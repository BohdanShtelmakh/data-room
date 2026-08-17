import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

export type DialogState = {
  title: string;
  description?: string;
  label?: string;
  initialValue?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (value: string) => void;
};

export function ActionDialog({
  dialog,
  onClose,
}: {
  dialog: DialogState;
  onClose: () => void;
}) {
  const [value, setValue] = useState(dialog.initialValue ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (dialog.label && !value.trim()) return;
    dialog.onConfirm(value.trim());
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        className="w-full max-w-md border border-zinc-300 bg-white p-5"
        onSubmit={submit}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">{dialog.title}</h2>
            {dialog.description && (
              <p className="mt-1 text-sm text-zinc-500">{dialog.description}</p>
            )}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        {dialog.label && (
          <label className="field mt-5">
            {dialog.label}
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={
              dialog.destructive
                ? "button border-red-600 bg-red-600 text-white hover:bg-red-700"
                : "button primary"
            }
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
