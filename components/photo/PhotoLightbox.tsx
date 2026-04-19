"use client";

import { useEffect, useState } from "react";

import type { Photo } from "@/types/photo";

import { PhotoAsset } from "./PhotoAsset";

import styles from "@/styles/photo/PhotoLightbox.module.css";

export function PhotoLightbox({
  open,
  groupId,
  photos,
  initialIndex,
  onClose,
  onDelete
}: Readonly<{
  open: boolean;
  groupId: string | null;
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (photoId: string) => Promise<void>;
}>) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft") {
        setCurrentIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === "ArrowRight") {
        setCurrentIndex((index) => Math.min(photos.length - 1, index + 1));
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose, open, photos.length]);

  if (!open || !groupId || photos.length === 0) {
    return null;
  }

  const activePhoto = photos[currentIndex];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose}>
          ✕
        </button>

        <div className={styles.media}>
          <PhotoAsset
            groupId={groupId}
            photo={activePhoto}
            alt={activePhoto.title}
            className={styles.image}
            fallbackClassName={styles.fallback}
          />
        </div>

        <div className={styles.info}>
          <div>
            <p className={styles.title}>{activePhoto.title}</p>
            {activePhoto.description ? (
              <p className={styles.description}>{activePhoto.description}</p>
            ) : null}
            {activePhoto.date ? <p className={styles.date}>{activePhoto.date}</p> : null}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              disabled={currentIndex === 0}
            >
              上一张
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() =>
                setCurrentIndex((index) => Math.min(photos.length - 1, index + 1))
              }
              disabled={currentIndex === photos.length - 1}
            >
              下一张
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => void onDelete(activePhoto.id)}
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
