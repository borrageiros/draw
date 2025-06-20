import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/controllers/authController";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    const { token, user, error, status } = await loginUser({
      email,
      password,
      rememberMe,
    });

    if (error) {
      return NextResponse.json({ error }, { status: status || 500 });
    }

    return NextResponse.json({ token, user }, { status: 200 });
  } catch (error) {
    console.error("Error in login:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
