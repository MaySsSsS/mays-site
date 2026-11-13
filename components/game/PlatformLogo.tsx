"use client";

import { useEffect, useState } from "react";

interface PlatformLogoProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * 演示用游戏标志渲染器。
 *
 * 参考项目的 logo 都是「深底 + 亮字」的位图，直接叠在游戏背景上会带一个黑框。
 * 这里用一个离屏 canvas 采样四角亮度：确认是深底图后，把暗像素的 alpha 按亮度
 * 压低（越暗越透明），得到「白字悬浮在背景上」的效果，与参考实现一致。
 */
export function PlatformLogo({ src, alt, className }: PlatformLogoProps) {
  const [processed, setProcessed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const threshold = 60;
      const last = data.length - 4;
      const corners = [0, (canvas.width - 1) * 4, last - (canvas.width - 1) * 4, last];

      const averageLuma =
        corners.reduce((sum, offset) => {
          const luma =
            0.299 * (data[offset] ?? 0) +
            0.587 * (data[offset + 1] ?? 0) +
            0.114 * (data[offset + 2] ?? 0);
          return sum + luma;
        }, 0) / corners.length;

      // 四角够暗才认为需要去掉底色，避免误伤本来透明的图
      if (averageLuma < 80) {
        for (let offset = 0; offset < data.length; offset += 4) {
          const luma =
            0.299 * (data[offset] ?? 0) +
            0.587 * (data[offset + 1] ?? 0) +
            0.114 * (data[offset + 2] ?? 0);

          if (luma < threshold) {
            data[offset + 3] = Math.round((luma / threshold) * 255);
          }
        }

        context.putImageData(imageData, 0, 0);
      }

      if (!cancelled) {
        setProcessed(canvas.toDataURL("image/png"));
      }
    };

    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!processed) {
    return null;
  }

  return (
    // 处理后的图是 data URL，无法走 next/image 优化
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={processed} alt={alt} draggable={false} />
  );
}