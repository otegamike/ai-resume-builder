import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/settings/:path*",
    "/templates/:path*",
    "/api/resumes/:path*",
    "/api/ai/:path*",
    "/api/templates/:path*",
    "/api/upload/:path*",
  ],
};
