/**
 * 照片 API 封装
 * 与 Cloudflare Worker 通信
 */

// Worker API 地址
const API_BASE =
  import.meta.env.VITE_PHOTO_API_URL ||
  "https://mays-photo-api.mays.workers.dev";

const TOKEN_KEY = "mays_photo_token";

// 获取存储的 token
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// 保存 token
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// 清除 token
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// 检查是否已认证
export function isAuthenticated(): boolean {
  return !!getToken();
}

// 认证请求
export async function authenticate(password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();
    if (data.success && data.token) {
      setToken(data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Authentication failed:", error);
    return false;
  }
}

// 带认证的请求封装
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

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    throw new Error("登录已过期，请重新登录");
  }

  return response;
}

// 获取分组数据
export async function fetchGroups(): Promise<{ groups: PhotoGroup[] }> {
  const response = await authFetch(`${API_BASE}/api/groups`);
  return response.json();
}

// 保存分组数据
export async function saveGroups(groups: PhotoGroup[]): Promise<void> {
  await authFetch(`${API_BASE}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groups }),
  });
}

// 上传照片
export async function uploadPhoto(
  file: File,
  groupId: string,
  photoId: string
): Promise<{ key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("groupId", groupId);
  formData.append("photoId", photoId);

  const response = await authFetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  return response.json();
}

// 获取照片 URL（需要通过 fetchPhotoBlob 获取，因为需要认证）
export function getPhotoUrl(groupId: string, photoId: string): string {
  return `${API_BASE}/api/image/${groupId}/${photoId}`;
}

// 获取照片（返回 blob URL）
export async function fetchPhotoBlob(
  groupId: string,
  photoId: string
): Promise<string> {
  const response = await authFetch(
    `${API_BASE}/api/image/${groupId}/${photoId}`
  );
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// 删除照片
export async function deletePhoto(
  groupId: string,
  photoId: string
): Promise<void> {
  await authFetch(`${API_BASE}/api/image/${groupId}/${photoId}`, {
    method: "DELETE",
  });
}

// 类型定义
export interface Photo {
  id: string;
  title: string;
  description?: string;
  date?: string;
  url?: string;
  blobUrl?: string; // 本地 blob URL
}

export interface PhotoGroup {
  id: string;
  name: string;
  city: string;
  location?: { lat: number; lng: number };
  coverUrl?: string;
  photos: Photo[];
  createdAt: string;
}
