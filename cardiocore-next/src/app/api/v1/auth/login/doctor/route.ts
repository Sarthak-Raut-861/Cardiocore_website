import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { AuthSuccessResponse, AuthUser } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      medicalCouncil,
      registrationNumber,
      institution,
      consentAgreement,
    } = body;

    if (!consentAgreement) {
      return NextResponse.json(
        { detail: "You must accept the clinical data-handling policy to proceed." },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { detail: "Work email is required." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { detail: "Password is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    let doctorName = "Dr. Neha Raghavan";
    if (trimmedEmail.includes("@") && !trimmedEmail.includes("neha")) {
      const prefix = trimmedEmail.split("@")[0].replace(".", " ");
      doctorName = "Dr. " + prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    const user: AuthUser = {
      id: "usr_doc_01",
      role: "doctor",
      name: doctorName,
      email: trimmedEmail,
      medicalCouncil: medicalCouncil || "Maharashtra Medical Council",
      registrationNumber: registrationNumber || "MMC-2010-44821",
      institution: institution || "Meridian Heart Institute",
    };

    const token = createSessionToken(user, 8);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

    const responsePayload: AuthSuccessResponse = {
      user,
      sessionExpiresAt: expiresAt,
      success: true,
      message: "Authenticated successfully as clinician.",
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
      { detail: error instanceof Error ? error.message : "Clinician authentication error." },
      { status: 500 }
    );
  }
}
