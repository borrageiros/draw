import { NextRequest, NextResponse } from "next/server";
import {
  createDrawing,
  getUserDrawings,
} from "@/controllers/drawingsController";
import { validateToken } from "@/controllers/authController";

async function getUserIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7); // Remove "Bearer "
  const { user, error } = await validateToken(token);
  if (error || !user) {
    return null;
  }
  return user.id;
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, drawingData } = body;

    if (!title || drawingData === undefined) {
      return NextResponse.json(
        { error: "Missing title or drawingData" },
        { status: 400 }
      );
    }

    const result = await createDrawing({ title, drawingData, userId });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error in POST /api/drawings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getUserDrawings(userId);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error in GET /api/drawings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
