import LoginClient from "./LoginClient";
import { sanitizeCallbackUrl } from "@/lib/authRedirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  return <LoginClient callbackUrl={callbackUrl} />;
}