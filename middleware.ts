import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const url = request.nextUrl.clone();

  if (url.pathname !== "/") {
    return NextResponse.next();
  }

  if (host.startsWith("game.")) {
    url.pathname = "/game";
    return NextResponse.rewrite(url);
  }

  if (host.startsWith("photo.")) {
    url.pathname = "/photos";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"]
};
