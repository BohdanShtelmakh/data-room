import { useState, type FormEvent } from "react";

type AuthMode = "login" | "register";

export function AuthPage({
  error,
  busy,
  onSubmit,
}: {
  error: string;
  busy: boolean;
  onSubmit: (mode: AuthMode, values: Record<string, string>) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("login");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Record<string, string>;
    void onSubmit(mode, values);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4">
      <section className="w-full max-w-sm border border-zinc-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Data Room</h1>
        <div className="mt-5 grid grid-cols-2 border border-zinc-200 p-1 text-sm">
          <button
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <label className="field">
              Name
              <input name="name" required maxLength={100} />
            </label>
          )}
          <label className="field">
            Email
            <input name="email" type="email" required />
          </label>
          <label className="field">
            Password
            <input name="password" type="password" required minLength={6} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="button primary w-full justify-center"
            disabled={busy}
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
