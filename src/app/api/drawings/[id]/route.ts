import { NextResponse } from "next/server";
import {
  getDrawingById,
  updateDrawing,
  deleteDrawing,
} from "@/controllers/drawingsController";
import { validateToken } from "@/controllers/authController";

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const { user, error } = await validateToken(token);
  if (error || !user) {
    return null;
  }
  return user.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(request: Request, { params }: any) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: drawingId } = params;
  if (!drawingId) {
    return NextResponse.json(
      { error: "Drawing ID is required" },
      { status: 400 }
    );
  }

  try {
    const result = await getDrawingById(drawingId, userId);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error(`Error in GET /api/drawings/${drawingId}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(request: Request, { params }: any) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: drawingId } = params;
  if (!drawingId) {
    return NextResponse.json(
      { error: "Drawing ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { title, drawingData, shared_with } = body;

    if (
      title === undefined &&
      drawingData === undefined &&
      shared_with === undefined
    ) {
      return NextResponse.json(
        { error: "No update data provided" },
        { status: 400 }
      );
    }

    const result = await updateDrawing(drawingId, userId, {
      title,
      data: drawingData,
      shared_with_users: shared_with,
    });
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error(`Error in PUT /api/drawings/${drawingId}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: Request, { params }: any) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: drawingId } = params;
  if (!drawingId) {
    return NextResponse.json(
      { error: "Drawing ID is required" },
      { status: 400 }
    );
  }

  try {
    const result = await deleteDrawing(drawingId, userId);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error(`Error in DELETE /api/drawings/${drawingId}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
