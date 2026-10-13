import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { SessionResponse } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

    if (!sessionCookie) {
      const unauthResponse: SessionResponse = {
        authenticated: false,
        user: null,
      };
      return NextResponse.json(unauthResponse, { status: 200 });
    }

    const user = verifySessionToken(sessionCookie);

    if (!user) {
      const expiredResponse: SessionResponse = {
        authenticated: false,
        user: null,
        error: "Session expired or invalid",
      };
      const res = NextResponse.json(expiredResponse, { status: 200 });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    const successResponse: SessionResponse = {
      authenticated: true,
      role: user.role,
      user,
      sessionExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, user: null, error: error instanceof Error ? error.message : "Session error" },
      { status: 500 }
    );
  }
}
