import "server-only";

export interface AiRequestContext {
  userId: string;
  userEmail: string;
}

export function aiContextFromAuthUser(authUser: {
  userObjectId: unknown;
  user?: { email?: string | null } | null;
}): AiRequestContext {
  return {
    userId: String(authUser.userObjectId),
    userEmail: authUser.user?.email || "",
  };
}
