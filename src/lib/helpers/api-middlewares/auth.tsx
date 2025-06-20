import { NextRequest } from "next/server";
import { validateToken } from "@/controllers/authController";

export async function authMiddleware(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { isAuthenticated: false, user: null };
  }
  
  const token = authHeader.substring(7);
  const { user } = await validateToken(token);
  
  return { isAuthenticated: !!user, user };
}