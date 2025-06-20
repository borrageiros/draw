import { NextRequest, NextResponse } from "next/server";
import { unshareDrawingWithUser } from "@/controllers/drawingsController";
import { authMiddleware } from "@/lib/helpers/api-middlewares/auth";

interface UnshareRequestBody {
  userIdToUnshare: string;
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
    const body = (await request.json()) as UnshareRequestBody;
    const { userIdToUnshare } = body;

    if (!userIdToUnshare) {
      return NextResponse.json(
        { error: "userIdToUnshare is required" },
        { status: 400 }
      );
    }

    const result = await unshareDrawingWithUser(
      drawingId,
      ownerUserId,
      userIdToUnshare
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error in POST /api/drawings/[id]/unshare:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
