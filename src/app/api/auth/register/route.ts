import { NextRequest, NextResponse } from "next/server";
import { register } from "@/controllers/authController";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { token, user, error, status } = await register(body);

    if (error) {
      return NextResponse.json({ error }, { status: status || 500 });
    }

    return NextResponse.json({ token, user }, { status: 201 });
  } catch (error) {
    console.error("Error in register:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
