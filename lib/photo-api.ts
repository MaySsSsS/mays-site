import type { Photo, PhotoGroup } from "@/types/photo";

const PHOTO_API_URL =
  process.env.NEXT_PUBLIC_PHOTO_API_URL ??
  "https://mays-photo-api.mays.workers.dev";

const TOKEN_KEY = "mays_photo_token";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
}

export function hasStoredToken(): boolean {
  return Boolean(getToken());
}

export async function authenticate(password: string): Promise<boolean> {
  try {
    const response = await fetch(`${PHOTO_API_URL}/api/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = (await response.json()) as {
      success?: boolean;
      token?: string;
    };

    if (data.success && data.token) {
      setToken(data.token);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  if (!token) {
    throw new Error("未登录");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearToken();
    throw new Error("登录已过期，请重新登录");
  }

  return response;
}

export async function fetchGroups(): Promise<{ groups: PhotoGroup[] }> {
  const response = await authFetch(`${PHOTO_API_URL}/api/groups`);
  return response.json();
}

export async function saveGroups(groups: PhotoGroup[]): Promise<void> {
  await authFetch(`${PHOTO_API_URL}/api/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ groups })
  });
}

export async function uploadPhoto(
  file: File,
  groupId: string,
  photoId: string
): Promise<{ key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("groupId", groupId);
  formData.append("photoId", photoId);

  const response = await authFetch(`${PHOTO_API_URL}/api/upload`, {
    method: "POST",
    body: formData
  });

  return response.json();
}

export async function fetchPhotoBlob(
  groupId: string,
  photoId: string
): Promise<string> {
  const response = await authFetch(
    `${PHOTO_API_URL}/api/image/${groupId}/${photoId}`
  );
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function deletePhoto(
  groupId: string,
  photoId: string
): Promise<void> {
  await authFetch(`${PHOTO_API_URL}/api/image/${groupId}/${photoId}`, {
    method: "DELETE"
  });
}

export type { Photo };
