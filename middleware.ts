import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const RETIRED_SUBDOMAINS = {
  "game.": "https://maysssss.cn/game",
  "photo.": "https://maysssss.cn/photos"
} as const;

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const replacement = Object.entries(RETIRED_SUBDOMAINS).find(([prefix]) =>
    host.startsWith(prefix)
  )?.[1];

  if (replacement) {
    return new NextResponse(
      `Legacy subdomain retired. Use ${replacement} instead.`,
      {
        status: 410,
        headers: {
          "cache-control": "public, max-age=0, must-revalidate",
          "content-type": "text/plain; charset=utf-8"
        }
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
