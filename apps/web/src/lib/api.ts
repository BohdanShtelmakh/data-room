const API_URL = import.meta.env.VITE_API_URL ?? "/api";

const accessTokenKey = "data-room-access-token";
const refreshTokenKey = "data-room-refresh-token";

type ResponseType = "json" | "blob";

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return body?.message ?? `Request failed (${response.status})`;
}

export function hasSession() {
  return Boolean(localStorage.getItem(accessTokenKey));
}

export function saveSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(accessTokenKey, accessToken);
  localStorage.setItem(refreshTokenKey, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(accessTokenKey);
  localStorage.removeItem(refreshTokenKey);
}

export function uploadFile(
  folderId: string,
  file: File,
  filename: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}/file/upload`);
    const token = localStorage.getItem(accessTokenKey);
    if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      try {
        const body = JSON.parse(request.responseText) as { message?: string };
        reject(new Error(body.message ?? `Upload failed (${request.status})`));
      } catch {
        reject(new Error(`Upload failed (${request.status})`));
      }
    });
    request.addEventListener("error", () =>
      reject(new Error("Upload connection failed")),
    );
    request.addEventListener("abort", () =>
      reject(new Error("Upload cancelled")),
    );
    signal?.addEventListener("abort", () => request.abort(), { once: true });
    const body = new FormData();
    body.set("folderId", folderId);
    body.append("files", file, filename);
    request.send(body);
  });
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
  responseType: ResponseType = "json",
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem(accessTokenKey);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    response = await retryWithRefreshedToken(path, init, headers, response);
  }
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return null as T;
  return (
    responseType === "blob" ? await response.blob() : await response.json()
  ) as T;
}

async function retryWithRefreshedToken(
  path: string,
  init: RequestInit,
  headers: Headers,
  originalResponse: Response,
) {
  const refreshToken = localStorage.getItem(refreshTokenKey);
  if (!refreshToken || path === "/auth/refresh") return originalResponse;

  const refreshed = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!refreshed.ok) return originalResponse;

  const tokens = (await refreshed.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  saveSession(tokens.accessToken, tokens.refreshToken);
  headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  return fetch(`${API_URL}${path}`, { ...init, headers });
}
