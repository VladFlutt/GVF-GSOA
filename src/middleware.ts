import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const header = req.headers.get("accept-language") ?? "";
  const preferred = locales.find((l) => header.toLowerCase().includes(l)) ?? defaultLocale;
  const url = req.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"] };
