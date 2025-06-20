import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/controllers/usersController";
import { authMiddleware } from "@/lib/helpers/api-middlewares/auth";

export async function GET(request: NextRequest) {
  const { isAuthenticated } = await authMiddleware(request);
  
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getUsers();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

