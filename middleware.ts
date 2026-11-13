import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const RETIRED_SUBDOMAINS = {
  "game.": "https://linkmays.com/games",
  "photo.": "https://linkmays.com/photos"
} as const;

/** 旧路由 /game（游戏仪表盘）已迁移到 /games/steam，保留 301 以便旧书签不 404 */
const LEGACY_GAME_PREFIX = /^\/game(\/|$)/;

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

  const { pathname, search } = request.nextUrl;

  if (LEGACY_GAME_PREFIX.test(pathname)) {
    const target = `${pathname.replace(/^\/game/, "/games/steam")}${search}`;
    return NextResponse.redirect(new URL(target, request.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
