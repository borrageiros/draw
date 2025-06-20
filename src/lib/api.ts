import { jwtDecode } from "jwt-decode";
import { IUser } from "@/models/User";

interface LoginRequest {
  email?: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: UserProfile;
}

interface DecodedToken {
  exp: number;
}

async function fetchApi<T, R>(
  endpoint: string,
  method: string = "GET",
  body?: T,
  headers?: Record<string, string>,
  requiresAuth: boolean = false
): Promise<ApiResponse<R>> {
  if (requiresAuth) {
    const token = localStorage.getItem("token");

    if (!token) {
      logout();
      return {
        error: "Authentication required. No token found.",
        status: 401,
      };
    }

    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      const currentTime = Date.now() / 1000;

      if (decodedToken.exp < currentTime) {
        logout();
        return {
          error: "Authentication required. Token expired.",
          status: 401,
        };
      }
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
    } catch (error) {
      console.error("Token validation error:", error);
      localStorage.removeItem("token");
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return {
        error: "Authentication required. Invalid token.",
        status: 401,
      };
    }
  }

  try {
    const requestHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(`/api${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        logout();
      }
      return {
        error: data.error || "Error en la petición",
        status: response.status,
      };
    }

    return {
      data: data,
      status: response.status,
    };
  } catch (error) {
    console.error("API request error:", error);
    return {
      error: error instanceof Error ? error.message : "Error desconocido",
      status: 500,
    };
  }
}

export async function login(
  credentials: LoginRequest
): Promise<ApiResponse<AuthResponse>> {
  return fetchApi<LoginRequest, AuthResponse>(
    "/auth/login",
    "POST",
    credentials
  );
}

export async function register(
  userData: RegisterRequest
): Promise<ApiResponse<AuthResponse>> {
  return fetchApi<RegisterRequest, AuthResponse>(
    "/auth/register",
    "POST",
    userData
  );
}

export async function logout(): Promise<void> {
  localStorage.removeItem("token");
  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
}

export async function getUsers(): Promise<ApiResponse<IUser[]>> {
  return fetchApi<undefined, IUser[]>("/users", "GET", undefined, {}, true);
}

// --- Drawing API Functions ---
export interface Drawing {
  _id: string;
  owner_id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  shared_with: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateDrawingRequest {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawingData: any;
}

export interface UpdateDrawingRequest {
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawingData?: any;
  shared_with?: string[];
}

export async function createDrawing(
  drawingData: CreateDrawingRequest
): Promise<ApiResponse<Drawing>> {
  return fetchApi<CreateDrawingRequest, Drawing>(
    "/drawings",
    "POST",
    drawingData,
    {},
    true
  );
}

export async function getAllDrawings(): Promise<ApiResponse<Drawing[]>> {
  return fetchApi<undefined, Drawing[]>(
    "/drawings",
    "GET",
    undefined,
    {},
    true
  );
}

export async function getOneDrawing(id: string): Promise<ApiResponse<Drawing>> {
  return fetchApi<undefined, Drawing>(
    `/drawings/${id}`,
    "GET",
    undefined,
    {},
    true
  );
}

export async function updateDrawing(
  id: string,
  updateData: UpdateDrawingRequest
): Promise<ApiResponse<Drawing>> {
  return fetchApi<UpdateDrawingRequest, Drawing>(
    `/drawings/${id}`,
    "PUT",
    updateData,
    {},
    true
  );
}

export async function deleteDrawing(
  id: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<undefined, { message: string }>(
    `/drawings/${id}`,
    "DELETE",
    undefined,
    {},
    true
  );
}

interface ShareDrawingRequestBody {
  userIdToShareWith: string;
}

export async function shareDrawingWithUser(
  drawingId: string,
  userIdToShareWith: string
): Promise<ApiResponse<Drawing>> {
  return fetchApi<ShareDrawingRequestBody, Drawing>(
    `/drawings/${drawingId}/share`,
    "POST",
    { userIdToShareWith },
    {},
    true
  );
}

interface UnshareDrawingRequestBody {
  userIdToUnshare: string;
}

export async function unshareDrawingWithUser(
  drawingId: string,
  userIdToUnshare: string
): Promise<ApiResponse<Drawing>> {
  return fetchApi<UnshareDrawingRequestBody, Drawing>(
    `/drawings/${drawingId}/unshare`,
    "POST",
    { userIdToUnshare },
    {},
    true
  );
}
