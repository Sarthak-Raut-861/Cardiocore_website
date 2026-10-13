import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { AuthSuccessResponse, AuthUser } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { detail: "Email or phone number is required." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { detail: "Password is required." },
        { status: 400 }
      );
    }

    // Patient user resolution
    const trimmedId = identifier.trim().toLowerCase();
    let patientName = "Aarav Menon";
    if (trimmedId.includes("@") && !trimmedId.includes("aarav")) {
      const prefix = trimmedId.split("@")[0];
      patientName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    const user: AuthUser = {
      id: "usr_pat_01",
      role: "patient",
      name: patientName,
      email: trimmedId.includes("@") ? trimmedId : "aarav.menon@example.com",
    };

    const token = createSessionToken(user, 8);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

    const responsePayload: AuthSuccessResponse = {
      user,
      sessionExpiresAt: expiresAt,
      success: true,
      message: "Authenticated successfully as patient.",
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
      { detail: error instanceof Error ? error.message : "Authentication processing error." },
      { status: 500 }
    );
  }
}
