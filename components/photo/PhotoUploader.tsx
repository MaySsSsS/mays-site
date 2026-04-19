"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

import type { UploadPhotoInput } from "@/types/photo";

import styles from "@/styles/photo/PhotoUploader.module.css";

interface SelectedFile {
  file: File;
  previewUrl: string;
}

export function PhotoUploader({
  onUpload,
  onCancel
}: Readonly<{
  onUpload: (photos: UploadPhotoInput[]) => Promise<void>;
  onCancel: () => void;
}>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<SelectedFile[]>([]);
  const [items, setItems] = useState<SelectedFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0] ?? "");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  function appendFiles(files: File[]) {
    const nextItems = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));

    setItems((current) => [...current, ...nextItems]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files) {
      return;
    }
    appendFiles(Array.from(event.target.files));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) {
      appendFiles(Array.from(event.dataTransfer.files));
    }
  }

  function removeFile(index: number) {
    setItems((current) => {
      const item = current[index];
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function resetFields(revokePreviews: boolean) {
    if (revokePreviews) {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    }
    setItems([]);
    setTitle("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0] ?? "");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (items.length === 0 || !title.trim() || submitting) {
      return;
    }

    setSubmitting(true);

    const payload = items.map((item, index) => ({
      file: item.file,
      url: item.previewUrl,
      title: items.length === 1 ? title.trim() : `${title.trim()} ${index + 1}`,
      description: description.trim() || undefined,
      date: date || undefined
    }));

    await onUpload(payload);
    resetFields(false);
    setSubmitting(false);
  }

  return (
    <div
      className={`${styles.wrapper} ${dragging ? styles.dragging : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.fileInput}
        onChange={handleFileChange}
      />

      {items.length === 0 ? (
        <button
          type="button"
          className={styles.emptyState}
          onClick={() => inputRef.current?.click()}
        >
          <span className={styles.emptyIcon}>⬆</span>
          <span>拖拽图片到这里，或点击选择图片</span>
          <span className={styles.emptyHint}>支持 JPG / PNG / WebP</span>
        </button>
      ) : (
        <>
          <div className={styles.previewGrid}>
            {items.map((item, index) => (
              <div key={`${item.file.name}-${index}`} className={styles.previewCard}>
                <img src={item.previewUrl} alt={item.file.name} className={styles.previewImage} />
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeFile(index)}
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              className={styles.addMore}
              onClick={() => inputRef.current?.click()}
            >
              + 继续添加
            </button>
          </div>

          <div className={styles.form}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="照片标题"
              className={styles.input}
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="描述（可选）"
              className={styles.textarea}
              rows={3}
            />
            <input
              value={date}
              onChange={(event) => setDate(event.target.value)}
              type="date"
              className={styles.input}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={onCancel}>
              取消
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => resetFields(true)}>
              清空
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
            >
              {submitting ? "处理中..." : `确认添加 (${items.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
