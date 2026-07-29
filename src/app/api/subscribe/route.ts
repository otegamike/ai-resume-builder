import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import { getPlanCode, getPlanAmount, buildPlanAllowlist } from "@/lib/subscription";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, interval } = await request.json();

    if (!planId || !interval || !["pro", "proPlus"].includes(planId) || !["monthly", "annually"].includes(interval)) {
      return NextResponse.json({ error: "Invalid planId or interval" }, { status: 400 });
    }

    const planCode = getPlanCode(planId as "pro" | "proPlus", interval as "monthly" | "annually");
    if (!planCode) {
      return NextResponse.json({ error: "Plan code not configured" }, { status: 500 });
    }

    const allowlist = buildPlanAllowlist();
    if (!allowlist.has(planCode)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const amount = getPlanAmount(planId as "pro" | "proPlus", interval as "monthly" | "annually");

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: session.user.email,
        amount,
        plan: planCode,
        callback_url: `${process.env.APP_URL}/billing/callback`,
        metadata: { userId: String(user._id) },
      }),
    });

    const data = await response.json();
    if (!data.status) {
      console.error("Paystack initialization failed:", data);
      return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
    }

    await Subscription.create({
      userId: user._id,
      planCode,
      interval,
      status: "pending",
    });

    return NextResponse.json({ authorization_url: data.data.authorization_url });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
