import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

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
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    session,
    user,
    userObjectId: user._id as Types.ObjectId,
    legacyUserId: session.user.id || "",
  };
}

export function buildResumeOwnerQuery(userObjectId: Types.ObjectId, legacyUserId: string) {
  const fallback = legacyUserId ? [{ userId: legacyUserId }] : [];
  return {
    $or: [{ user: userObjectId }, ...fallback],
  };
}