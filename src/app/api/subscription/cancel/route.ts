import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Subscription from "@/models/Subscription";
import User from "@/models/User";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      status: { $in: ["active", "non-renewing"] },
    });

    if (!subscription?.subscriptionCode || !subscription?.emailToken) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const response = await fetch("https://api.paystack.co/subscription/disable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: subscription.subscriptionCode,
        token: subscription.emailToken,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      console.error("Paystack disable failed:", data);
      return NextResponse.json({ error: "Failed to disable subscription" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Subscription cancelled. It will remain active until the end of the billing period.",
    });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
