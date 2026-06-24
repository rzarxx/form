import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("admin_session")?.value;

    if (!sessionCookie) {
      // Redirect to login page
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Validasi token sesi ke API endpoint internal yang kompatibel dengan Node.js runtime
      const verifyUrl = new URL("/api/auth/session", request.url);
      const res = await fetch(verifyUrl.toString(), {
        headers: {
          cookie: `admin_session=${sessionCookie}`,
        },
      });

      if (!res.ok) {
        // Jika sesi tidak valid di database, hapus cookie dan redirect ke login
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("admin_session");
        return response;
      }
    } catch (err) {
      console.error("[Proxy Session Check Error]:", err);
      // Fallback: Jika pemanggilan internal API bermasalah, biarkan masuk agar tidak hard-fail
    }
  }

  // Redirect logged-in users away from the login page
  if (pathname === "/login") {
    const sessionCookie = request.cookies.get("admin_session")?.value;

    if (sessionCookie) {
      try {
        const verifyUrl = new URL("/api/auth/session", request.url);
        const res = await fetch(verifyUrl.toString(), {
          headers: {
            cookie: `admin_session=${sessionCookie}`,
          },
        });

        if (res.ok) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch (err) {
        console.error("[Proxy Login Check Error]:", err);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
