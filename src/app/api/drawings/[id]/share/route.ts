import { NextRequest, NextResponse } from "next/server";
import { shareDrawingWithUser } from "@/controllers/drawingsController";
import { authMiddleware } from "@/lib/helpers/api-middlewares/auth";

interface ShareRequestBody {
  userIdToShareWith: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: NextRequest, { params }: any) {
  const authResult = await authMiddleware(request);
  if (!authResult.isAuthenticated || !authResult.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drawingId = params.id;
  const ownerUserId = authResult.user.id;

  try {
    const body = (await request.json()) as ShareRequestBody;
    const { userIdToShareWith } = body;

    if (!userIdToShareWith) {
      return NextResponse.json(
        { error: "userIdToShareWith is required" },
        { status: 400 }
      );
    }

    const result = await shareDrawingWithUser(
      drawingId,
      ownerUserId,
      userIdToShareWith
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error in POST /api/drawings/[id]/share:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
