"use client";

import { useEffect, useState } from "react";

import { fetchPhotoBlob } from "@/lib/photo-api";
import type { Photo } from "@/types/photo";

export function PhotoAsset({
  groupId,
  photo,
  alt,
  className,
  fallbackClassName
}: Readonly<{
  groupId: string;
  photo: Photo;
  alt: string;
  className: string;
  fallbackClassName: string;
}>) {
  const [src, setSrc] = useState<string | null>(photo.url ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    if (photo.url) {
      setSrc(photo.url);
      setFailed(false);
      return;
    }

    async function loadPhoto() {
      try {
        const nextUrl = await fetchPhotoBlob(groupId, photo.id);
        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        blobUrl = nextUrl;
        setSrc(nextUrl);
        setFailed(false);
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void loadPhoto();

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [groupId, photo.id, photo.url]);

  if (!src || failed) {
    return <div className={fallbackClassName}>{failed ? "图片不可用" : "载入中..."}</div>;
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
