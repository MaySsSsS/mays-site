"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { CHINA_CITIES } from "@/lib/photo";

import styles from "@/styles/photo/CitySelector.module.css";

export function CitySelector({
  open,
  onClose,
  onSelect
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSelect: (city: string) => void;
}>) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const cityList = Object.keys(CHINA_CITIES).filter((city) =>
    deferredQuery ? city.toLowerCase().includes(deferredQuery) : true
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>SELECT CITY</p>
            <h3 className={styles.title}>新建照片分组</h3>
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            ✕
          </button>
        </div>

        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="搜索城市"
          className={styles.search}
        />

        <div className={styles.grid}>
          {cityList.map((city) => (
            <button
              key={city}
              type="button"
              className={styles.cityButton}
              onClick={() => onSelect(city)}
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
