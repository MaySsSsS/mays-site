import type { Metadata } from "next";

import { QrStudio } from "@/components/tools/QrStudio";

export const metadata: Metadata = {
  title: "QR Studio",
  description: "在线生成二维码，支持颜色、尺寸和 PNG/SVG 下载。"
};

export default function QrStudioPage() {
  return <QrStudio />;
}
