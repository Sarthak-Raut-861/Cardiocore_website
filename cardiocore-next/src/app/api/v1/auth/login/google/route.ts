import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { AuthSuccessResponse, AuthUser } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty in simulated one-click flow
    }
    const { credential, email, name } = body;

    let userEmail = "aarav.menon@example.com";
    let userName = "Aarav Menon";
    let userId = "usr_pat_google_01";

    // If a Google JWT ID token credential is provided, decode claims
    if (credential && typeof credential === "string") {
      try {
        const parts = credential.split(".");
        if (parts.length >= 2) {
          const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
          const claims = JSON.parse(payloadJson);
          if (claims.email) userEmail = claims.email;
          if (claims.name) userName = claims.name;
          if (claims.sub) userId = `usr_pat_g_${String(claims.sub).slice(0, 10)}`;
        }
      } catch {
        // Fall back to provided or default
      }
    }

    if (email && typeof email === "string" && email.includes("@")) {
      userEmail = email.trim().toLowerCase();
    }
    if (name && typeof name === "string" && name.trim()) {
      userName = name.trim();
    } else if (userEmail && userEmail !== "aarav.menon@example.com") {
      const prefix = userEmail.split("@")[0];
      userName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    const user: AuthUser = {
      id: userId,
      role: "patient",
      name: userName,
      email: userEmail,
    };

    const token = createSessionToken(user, 8);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

    const responsePayload: AuthSuccessResponse = {
      user,
      sessionExpiresAt: expiresAt,
      success: true,
      message: "Authenticated successfully with Google.",
    };

    const response = NextResponse.json(responsePayload, { status: 200 });

    // Set HttpOnly session cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Google authentication processing error." },
      { status: 500 }
    );
  }
}
