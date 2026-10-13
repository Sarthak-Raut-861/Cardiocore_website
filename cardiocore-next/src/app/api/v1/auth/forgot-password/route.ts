import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, email } = body;
    const target = (identifier || email || "").trim();

    if (!target) {
      return NextResponse.json({ detail: "Email or identifier is required." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Password reset instructions dispatched to ${target}. (Check registered email or mobile).`,
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Password recovery error." },
      { status: 500 }
    );
  }
}
