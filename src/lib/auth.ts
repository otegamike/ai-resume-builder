import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      await dbConnect();
      await User.findOneAndUpdate(
        { email: user.email },
        {
          name: user.name ?? "",
          email: user.email,
          image: user.image ?? "",
          $addToSet: {
            oauthAccounts: {
              provider: account?.provider ?? "google",
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
      const dbUser = await User.findOne({ email: token.email }).select("_id email name image");
      if (dbUser) {
        token.userId = String(dbUser._id);
        token.name = dbUser.name;
        token.picture = dbUser.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
