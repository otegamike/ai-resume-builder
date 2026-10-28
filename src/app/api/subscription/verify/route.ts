import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Reference is required" }, { status: 400 });
    }

    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }

      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      return handleApiError(error, { route: "/api/subscription/verify", flow: "subscription" });
    }
  },
  { route: "/api/subscription/verify", flow: "subscription" }
);
