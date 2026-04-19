import { PhotoShell } from "@/components/photo/PhotoShell";

export default function PhotoLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PhotoShell>{children}</PhotoShell>;
}
