import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/gmail/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    await dbConnect();
    await User.findOneAndUpdate(
      { email: session.user.email },
      {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    );

    // Redirect to the success page to close the tab and postMessage
    return NextResponse.redirect(new URL("/auth/gmail/success", req.url));
  } catch (error) {
    console.error("Error in Gmail callback", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}
