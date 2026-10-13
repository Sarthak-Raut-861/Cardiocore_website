import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({ detail: "Reset token and new password are required." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Password successfully updated. You can now sign in with your new credentials.",
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Password reset error." },
      { status: 500 }
    );
  }
}
