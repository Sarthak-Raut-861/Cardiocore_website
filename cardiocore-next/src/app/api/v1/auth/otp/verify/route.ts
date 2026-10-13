import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { AuthSuccessResponse, AuthUser } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, code } = body;

    if (!code || code.trim().length < 6) {
      return NextResponse.json({ detail: "Please enter the complete 6-digit code." }, { status: 400 });
    }

    const user: AuthUser = {
      id: "usr_pat_01",
      role: "patient",
      name: "Aarav Menon",
      email: "aarav.menon@example.com",
    };

    const token = createSessionToken(user, 8);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

    const responsePayload: AuthSuccessResponse = {
      user,
      sessionExpiresAt: expiresAt,
      success: true,
      message: "One-time code verified successfully.",
    };

    const response = NextResponse.json(responsePayload, { status: 200 });

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
      { detail: error instanceof Error ? error.message : "OTP verification error." },
      { status: 500 }
    );
  }
}
