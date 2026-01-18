import { NextRequest } from "next/server";
import { getAdminAuth } from "./firebase-admin";

/**
 * Get the authenticated user ID from the request
 * This verifies the Firebase Auth token from the Authorization header
 */
export async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

/**
 * Require authentication and return the user ID, or throw an error
 */
export async function requireAuth(req: NextRequest): Promise<string> {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    throw new Error("Unauthorized: Authentication required");
  }
  return userId;
}
