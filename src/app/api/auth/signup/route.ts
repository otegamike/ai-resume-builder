import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { enqueue, dedupeKeys } from "@/lib/email/dispatcher";
import { drainOutbox } from "@/lib/email/drain";
import { appUrl } from "@/lib/email/site";

function createPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").toLowerCase().trim();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await dbConnect();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Account already exists for this email" }, { status: 409 });
    }

    const created = await User.create({
      name,
      email,
      passwordHash: createPasswordHash(password),
      authProviders: ["credentials"],
      oauthAccounts: [],
      hasCompletedOnboarding: false,
    });

    // Transactional welcome email. Runs after the response; a failure here
    // must never fail the signup itself.
    try {
      await enqueue({
        type: "welcome",
        to: created.email,
        userId: created._id,
        payload: { name: created.name, dashboardUrl: `${appUrl()}/dashboard` },
        dedupeKey: dedupeKeys.welcome(String(created._id)),
      });
      after(() => {
        drainOutbox({ limit: 5 }).catch((err) => console.error("Welcome email drain failed:", err));
      });
    } catch (err) {
      console.error("Welcome email enqueue failed:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}