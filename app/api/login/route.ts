import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/");
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  const expected = process.env.SITE_PASSWORD;
  const url = request.nextUrl.clone();

  if (!expected || password !== expected) {
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "1");
    url.searchParams.set("redirect", safeRedirect);
    return NextResponse.redirect(url, 303);
  }

  url.pathname = safeRedirect.split("?")[0];
  url.search = safeRedirect.includes("?") ? safeRedirect.split("?").slice(1).join("?") : "";

  const response = NextResponse.redirect(url, 303);
  response.cookies.set(AUTH_COOKIE_NAME, await hashPassword(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  return response;
}
