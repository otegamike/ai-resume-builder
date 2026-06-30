import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { google } from "googleapis";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, message, pdfBase64 } = body;

    if (!to || !subject || !message || !pdfBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.gmailAccessToken) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 403 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken,
      expiry_date: user.gmailTokenExpiresAt ? user.gmailTokenExpiresAt.getTime() : null,
    });

    const tokens = await oauth2Client.getAccessToken();
    if (tokens.token && tokens.token !== user.gmailAccessToken) {
      user.gmailAccessToken = tokens.token;
      await user.save();
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: user.email,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: user.gmailRefreshToken,
        accessToken: tokens.token || user.gmailAccessToken,
      },
    });

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "").replace(/^data:application\/pdf;filename=.*?;base64,/, "");

    const mailOptions = {
      from: user.email,
      to,
      subject,
      text: message,
      attachments: [
        {
          filename: "CV.pdf",
          content: base64Data,
          encoding: "base64",
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
