import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import User from "@/models/User";

export async function backfillResumeUsers() {
  await dbConnect();
  const users = await User.find({}).select("_id");
  let updated = 0;

  for (const user of users) {
    const result = await Resume.updateMany(
      { userId: String(user._id), user: { $exists: false } },
      { $set: { user: user._id } }
    );
    updated += result.modifiedCount;
  }

  return { updated };
}