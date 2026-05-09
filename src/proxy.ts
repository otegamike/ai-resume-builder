import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/settings/:path*",
    "/api/resumes/:path*",
    "/api/ai/:path*",
    "/api/upload/:path*",
  ],
};
