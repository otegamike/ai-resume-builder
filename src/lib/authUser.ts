import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

// Minimal identity passed into server-only services. Ownership is always the
// ObjectId `user` field; legacy string ids are gone.
export interface AuthUserShape {
  userObjectId: Types.ObjectId;
}

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;

  await dbConnect();
  const user = await User.findOneAndUpdate(
    { email },
    {
      name: session.user.name ?? "",
      image: session.user.image ?? "",
      email,
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  return {
    session,
    user,
    userObjectId: user._id as Types.ObjectId,
  };
}

// Single ownership rule for user-owned documents: the ObjectId `user` field.
// Legacy string ids are no longer consulted anywhere.
export function buildResumeOwnerQuery(userObjectId: Types.ObjectId) {
  return {
    user: userObjectId,
  };
}