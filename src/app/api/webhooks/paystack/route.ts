import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import WebhookEvent from "@/models/WebhookEvent";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import { resolveTierFromPlanCode } from "@/lib/subscription";
import { resetCreditsIfNeeded } from "@/lib/creditUtils";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY is not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventId: string | undefined = event?.data?.id;
    const eventType: string | undefined = event?.event;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    await dbConnect();

    const existing = await WebhookEvent.findOne({ paystackEventId: eventId });
    if (existing) {
      return NextResponse.json({ status: "already_processed" });
    }

    await WebhookEvent.create({
      paystackEventId: eventId,
      eventType,
    });

    const d = event.data;

    switch (eventType) {
      case "charge.success":
      case "subscription.create": {
        const customerEmail = d?.customer?.email;
        const planCode = d?.plan?.plan_code ?? d?.plan_code;
        const subscriptionCode = d?.subscription_code ?? d?.subscription?.subscription_code;
        const emailToken = d?.email_token ?? d?.subscription?.email_token;
        const customerCode = d?.customer?.customer_code;
        const customerId = d?.customer?.id;
        const currentPeriodEnd = d?.next_payment_date ? new Date(d.next_payment_date) : undefined;

        if (!customerEmail) break;

        const user = await User.findOne({ email: customerEmail });
        if (!user) break;

        const tierInfo = resolveTierFromPlanCode(planCode);

        await Subscription.findOneAndUpdate(
          { userId: user._id },
          {
            $set: {
              status: "active",
              subscriptionCode: subscriptionCode ?? "",
              emailToken: emailToken ?? "",
              planCode: planCode ?? "",
              interval: tierInfo?.interval ?? "monthly",
              paystackCustomerCode: customerCode ?? "",
              paystackCustomerId: customerId ?? 0,
              currentPeriodEnd: currentPeriodEnd ?? null,
            },
          },
          { upsert: true }
        );

        await User.findByIdAndUpdate(user._id, {
          $set: {
            subscriptionPlan: tierInfo?.tier ?? "pro",
            subscriptionStatus: "active",
          },
        });

        if (tierInfo) {
          await resetCreditsIfNeeded(String(user._id), tierInfo.tier, true);
        }
        break;
      }

      case "invoice.update": {
        const subCodeInvoice = d?.subscription?.subscription_code;
        if (!subCodeInvoice) break;
        const update: Record<string, unknown> = {};
        if (d?.next_payment_date) {
          update.currentPeriodEnd = new Date(d.next_payment_date);
        }
        if (Object.keys(update).length > 0) {
          await Subscription.findOneAndUpdate(
            { subscriptionCode: subCodeInvoice },
            { $set: update }
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const subCodeFailed = d?.subscription?.subscription_code;
        if (!subCodeFailed) break;
        await Subscription.findOneAndUpdate(
          { subscriptionCode: subCodeFailed },
          { $set: { status: "past_due" } }
        );
        break;
      }

      case "subscription.not_renew": {
        const subCodeNR = d?.subscription_code ?? d?.subscription?.subscription_code;
        if (!subCodeNR) break;
        await Subscription.findOneAndUpdate(
          { subscriptionCode: subCodeNR },
          { $set: { status: "non-renewing" } }
        );
        break;
      }

      case "subscription.disable": {
        const subCodeD = d?.subscription_code ?? d?.subscription?.subscription_code;
        if (!subCodeD) break;
        const sub = await Subscription.findOneAndUpdate(
          { subscriptionCode: subCodeD },
          { $set: { status: "cancelled" } }
        );
        if (sub) {
          await User.findByIdAndUpdate(sub.userId, {
            $set: { subscriptionStatus: "inactive" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ status: "processed" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
