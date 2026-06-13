import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import User from "@/models/User";

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

      const provider = account?.provider ?? "google";
      await User.findOneAndUpdate(
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
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;
      await dbConnect();
      const dbUser = await User.findOne({ email: token.email }).select("_id email name image isAdmin subscriptionPlan AiCredits");
      if (dbUser) {
        token.userId = String(dbUser._id);
        token.name = dbUser.name;
        token.picture = dbUser.image;
        token.isAdmin = dbUser.isAdmin ?? false;
        token.subscriptionPlan = dbUser.subscriptionPlan ?? "free";
        token.AiCredits = dbUser.AiCredits ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? "";
        session.user.isAdmin = (token.isAdmin as boolean | undefined) ?? false;
        session.user.subscriptionPlan = (token.subscriptionPlan as string | undefined) ?? "free";
        session.user.AiCredits = (token.AiCredits as number | undefined) ?? 0;
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