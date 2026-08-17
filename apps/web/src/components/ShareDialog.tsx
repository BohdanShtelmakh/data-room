import { useEffect, useState, type FormEvent } from "react";
import { Copy, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import type { ShareResourceType } from "../types/domain";

type Share = {
  id: string;
  token: string;
  type: "PUBLIC" | "USER";
  resourceType: ShareResourceType;
  resourceId: string;
  user: { email: string } | null;
  expiresAt?: string | null;
};

export function ShareDialog({
  resourceType,
  resourceId,
  resourceName,
  onClose,
}: {
  resourceType: ShareResourceType;
  resourceId: string;
  resourceName: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<"PUBLIC" | "USER">("PUBLIC");
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState<Share[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const load = async () => {
    const all = await api<Share[]>("/share");
    setShares(
      all.filter(
        (share) =>
          share.resourceType === resourceType &&
          share.resourceId === resourceId,
      ),
    );
  };
  useEffect(() => {
    void (async () => {
      try {
        const all = await api<Share[]>("/share");
        setShares(
          all.filter(
            (share) =>
              share.resourceType === resourceType &&
              share.resourceId === resourceId,
          ),
        );
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Unable to load shares",
        );
      }
    })();
  }, [resourceId, resourceType]);
  const copyLink = (token: string) =>
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
  const create = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    void api<Share>("/share", {
      method: "POST",
      body: JSON.stringify({
        type,
        resourceType,
        resourceId,
        email: type === "USER" ? email : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }),
    })
      .then(async (share) => {
        setEmail("");
        await load();
        if (share.type === "PUBLIC") await copyLink(share.token);
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to create share",
        ),
      )
      .finally(() => setBusy(false));
  };
  const revoke = (id: string) =>
    void api(`/share/${id}`, { method: "DELETE" })
      .then(load)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to revoke share",
        ),
      );
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-lg border border-zinc-300 bg-white p-5">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Share {resourceName}</h2>
            <p className="text-xs text-zinc-500">Shared access is read-only</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <form className="mt-5 space-y-3" onSubmit={create}>
          <div className="grid grid-cols-2 border border-zinc-200 p-1 text-sm">
            <button
              type="button"
              className={type === "PUBLIC" ? "auth-tab active" : "auth-tab"}
              onClick={() => setType("PUBLIC")}
            >
              Public link
            </button>
            <button
              type="button"
              className={type === "USER" ? "auth-tab active" : "auth-tab"}
              onClick={() => setType("USER")}
            >
              Existing user
            </button>
          </div>
          {type === "USER" && (
            <label className="field">
              User email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
          )}
          <label className="field">
            Expires (optional)
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="button primary w-full justify-center"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create share"}
          </button>
        </form>
        <div className="mt-5 divide-y divide-zinc-100 border-t border-zinc-200">
          {shares.map((share) => (
            <div
              className="flex items-center justify-between py-3 text-sm"
              key={share.id}
            >
              <span>
                <span className="block">
                  {share.type === "PUBLIC"
                    ? "Anyone with the link"
                    : share.user?.email}
                </span>
                <span className="block text-xs text-zinc-500">
                  Can view
                  {share.expiresAt
                    ? ` · expires ${new Date(share.expiresAt).toLocaleDateString()}`
                    : " · no expiration"}
                </span>
              </span>
              <div className="flex gap-1">
                {share.type === "PUBLIC" && (
                  <button
                    className="icon-button"
                    title="Copy link"
                    onClick={() => void copyLink(share.token)}
                  >
                    <Copy size={16} />
                  </button>
                )}
                <button
                  className="icon-button danger"
                  title="Revoke share"
                  onClick={() => revoke(share.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {!shares.length && (
            <p className="py-4 text-sm text-zinc-500">Not shared yet</p>
          )}
        </div>
      </section>
    </div>
  );
}
