import type { NextAuthOptions } from "next-auth";
import { after } from "next/server";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { resetCreditsIfNeeded, getCurrentCycleString } from "@/lib/creditUtils";
import { MAX_CREDITS_PER_PLAN } from "@/lib/creditCosts";
import { enqueue, dedupeKeys } from "@/lib/email/dispatcher";
import { drainOutbox } from "@/lib/email/drain";
import { appUrl } from "@/lib/email/site";

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  return hashPassword(password, salt) === key;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        await dbConnect();
        const user = await User.findOne({ email });
        if (!user?.passwordHash) return null;
        if (!verifyPassword(password, user.passwordHash)) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      await dbConnect();

      const existing = await User.findOne({ email: user.email });
      const isNewUser = !existing;

      const provider = account?.provider ?? "google";
      const dbUser = await User.findOneAndUpdate(
        { email: user.email },
        {
          name: user.name ?? "",
          email: user.email,
          image: user.image ?? "",
          $addToSet: {
            authProviders: provider,
            oauthAccounts: {
              provider,
              providerAccountId: account?.providerAccountId ?? user.email,
            },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      if (isNewUser) {
        await User.updateOne({ email: user.email }, { $set: { hasCompletedOnboarding: false } });
        // Transactional welcome email for OAuth signups. Same dedupe key
        // scheme as the credentials route, so only one welcome ever sends.
        try {
          await enqueue({
            type: "welcome",
            to: String(dbUser!.email),
            userId: dbUser!._id,
            payload: { name: dbUser!.name ?? "", dashboardUrl: `${appUrl()}/dashboard` },
            dedupeKey: dedupeKeys.welcome(String(dbUser!._id)),
          });
          after(() => {
            drainOutbox({ limit: 5 }).catch((err) =>
              console.error("Welcome email drain failed:", err)
            );
          });
        } catch (err) {
          console.error("Welcome email enqueue failed:", err);
        }
      }

      await resetCreditsIfNeeded(String(dbUser!._id), dbUser!.subscriptionPlan);
      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;
      await dbConnect();
      const dbUser = await User.findOne({ email: token.email }).select(
        "_id email name image isAdmin subscriptionPlan AiCredits gmailAccessToken hasCompletedOnboarding creditResetMeta accountType organizationId"
      );
      if (dbUser) {
        token.userId = String(dbUser._id);
        token.name = dbUser.name;
        token.picture = dbUser.image;
        token.isAdmin = dbUser.isAdmin ?? false;
        token.subscriptionPlan = dbUser.subscriptionPlan ?? "free";
        token.AiCredits = dbUser.AiCredits ?? 0;
        token.hasGmailConnected = !!dbUser.gmailAccessToken;
        token.hasCompletedOnboarding = dbUser.hasCompletedOnboarding ?? true;
        token.accountType = dbUser.accountType ?? "candidate";
        token.organizationId = dbUser.organizationId ? String(dbUser.organizationId) : undefined;

        const currentCycle = getCurrentCycleString();
        if (dbUser.creditResetMeta?.lastResetCycle !== currentCycle) {
          await resetCreditsIfNeeded(String(dbUser._id), dbUser.subscriptionPlan);
          const plan = dbUser.subscriptionPlan || "free";
          token.AiCredits = MAX_CREDITS_PER_PLAN[plan as keyof typeof MAX_CREDITS_PER_PLAN] ?? MAX_CREDITS_PER_PLAN.free;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const extendedUser = session.user as typeof session.user & {
          hasGmailConnected?: boolean;
          accountType?: string;
          organizationId?: string;
        };
        session.user.id = (token.userId as string | undefined) ?? "";
        session.user.isAdmin = (token.isAdmin as boolean | undefined) ?? false;
        session.user.subscriptionPlan = (token.subscriptionPlan as string | undefined) ?? "free";
        session.user.AiCredits = (token.AiCredits as number | undefined) ?? 0;
        extendedUser.hasGmailConnected = (token.hasGmailConnected as boolean | undefined) ?? false;
        session.user.hasCompletedOnboarding = (token.hasCompletedOnboarding as boolean | undefined) ?? true;
        extendedUser.accountType = (token.accountType as string | undefined) ?? "candidate";
        extendedUser.organizationId = (token.organizationId as string | undefined) ?? undefined;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch {
        // ignore
      }
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};