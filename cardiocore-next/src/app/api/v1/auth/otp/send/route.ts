import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json({ detail: "Mobile number is required." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "One-time code dispatched successfully. Demo code: 481200",
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "OTP dispatch error." },
      { status: 500 }
    );
  }
}
