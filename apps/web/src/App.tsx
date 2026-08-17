import { useEffect, useState } from "react";
import { api, clearSession, hasSession, saveSession } from "./lib/api";
import { AuthPage } from "./pages/AuthPage";
import { DataRoomPage } from "./pages/DataRoomPage";
import { PublicSharePage } from "./pages/PublicSharePage";
import { SharedPage } from "./pages/SharedPage";
import type { AuthResponse, User } from "./types/domain";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showShared, setShowShared] = useState(false);
  const publicToken = window.location.pathname.match(/^\/share\/([^/]+)$/)?.[1];

  useEffect(() => {
    if (!hasSession()) return;
    void (async () => {
      try {
        setUser(await api<User>("/auth/profile"));
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const authenticate = async (
    mode: "login" | "register",
    values: Record<string, string>,
  ) => {
    setError("");
    setBusy(true);
    try {
      const result = await api<AuthResponse>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      saveSession(result.accessToken, result.refreshToken);
      setUser(result.user);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Authentication failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    void api("/auth/logout", { method: "POST" }).catch(() => undefined);
    clearSession();
    setUser(null);
  };

  if (publicToken) return <PublicSharePage token={publicToken} />;
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center text-sm text-zinc-500">
        Loading…
      </main>
    );
  if (!user)
    return <AuthPage error={error} busy={busy} onSubmit={authenticate} />;
  if (showShared) return <SharedPage onBack={() => setShowShared(false)} />;
  return (
    <DataRoomPage
      user={user}
      onLogout={logout}
      onOpenShared={() => setShowShared(true)}
    />
  );
}

export default App;
