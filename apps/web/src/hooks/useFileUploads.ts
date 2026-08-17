import { useState, type Dispatch, type SetStateAction } from "react";
import type { DialogState } from "../components/ActionDialog";
import type { UploadItem } from "../components/UploadPanel";
import { api, uploadFile } from "../lib/api";

export function useFileUploads({
  folderId,
  setDialog,
  notify,
  onError,
  onContentChange,
}: {
  folderId: string | null;
  setDialog: Dispatch<SetStateAction<DialogState | null>>;
  notify: (message: string) => void;
  onError: (message: string) => void;
  onContentChange: (folderId: string) => Promise<void>;
}) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const startUpload = async (item: UploadItem, targetFolderId: string) => {
    const controller = new AbortController();
    setUploads((current) =>
      current.map((upload) =>
        upload.id === item.id
          ? {
              ...upload,
              progress: 0,
              status: "uploading",
              error: undefined,
              controller,
            }
          : upload,
      ),
    );
    try {
      await uploadFile(
        targetFolderId,
        item.file,
        item.name,
        (progress) =>
          setUploads((current) =>
            current.map((upload) =>
              upload.id === item.id ? { ...upload, progress } : upload,
            ),
          ),
        controller.signal,
      );
      setUploads((current) =>
        current.map((upload) =>
          upload.id === item.id
            ? { ...upload, progress: 100, status: "done" }
            : upload,
        ),
      );
      window.setTimeout(
        () =>
          setUploads((current) =>
            current.filter((upload) => upload.id !== item.id),
          ),
        1000,
      );
    } catch (reason) {
      setUploads((current) =>
        current.map((upload) =>
          upload.id === item.id
            ? {
                ...upload,
                status: "error",
                error:
                  reason instanceof Error ? reason.message : "Upload failed",
              }
            : upload,
        ),
      );
    }
  };

  const receiveFiles = (files: File[]) => {
    if (!files.length || !folderId) return;
    if (files.length > 5) notify("Only the first 5 files were added");
    const queued: UploadItem[] = files.slice(0, 5).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      progress: 0,
      status: file.size > 10 * 1024 * 1024 ? "error" : "uploading",
      file,
      error:
        file.size > 10 * 1024 * 1024
          ? "File exceeds the 10 MB limit"
          : undefined,
    }));
    setUploads((current) => [...queued, ...current]);
    void (async () => {
      await api("/auth/profile");
      await Promise.allSettled(
        queued
          .filter((item) => item.status === "uploading")
          .map((item) => startUpload(item, folderId)),
      );
      await onContentChange(folderId);
    })().catch((reason: unknown) =>
      onError(
        reason instanceof Error ? reason.message : "Unable to start uploads",
      ),
    );
  };

  const retry = (item: UploadItem) => {
    if (!folderId) return;
    void api("/auth/profile")
      .then(() => startUpload(item, folderId))
      .then(() => onContentChange(folderId))
      .catch((reason: unknown) =>
        onError(reason instanceof Error ? reason.message : "Retry failed"),
      );
  };

  const rename = (item: UploadItem) => {
    setDialog({
      title: "Rename and retry",
      label: "File name",
      initialValue: item.name,
      confirmLabel: "Retry upload",
      onConfirm: (name) => {
        if (name === item.name || !folderId) return;
        const updated = { ...item, name };
        setUploads((current) =>
          current.map((upload) => (upload.id === item.id ? updated : upload)),
        );
        retry(updated);
      },
    });
  };

  return {
    uploads,
    receiveFiles,
    retry,
    rename,
    remove: (id: string) =>
      setUploads((current) => current.filter((item) => item.id !== id)),
    cancel: (item: UploadItem) => item.controller?.abort(),
    retryAll: () =>
      uploads
        .filter(
          (item) => item.status === "error" && !item.error?.includes("10 MB"),
        )
        .forEach(retry),
    clearFailed: () =>
      setUploads((current) =>
        current.filter((item) => item.status !== "error"),
      ),
  };
}
