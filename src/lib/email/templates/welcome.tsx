import { Link, Text } from "@react-email/components";
import Layout, { buttonStyle, detailBoxStyle, headingStyle, mutedStyle, paragraphStyle } from "./Layout";
import { appUrl } from "../site";

export interface WelcomeProps {
  name: string;
  dashboardUrl?: string;
}

export function welcomeSubject(props: WelcomeProps): string {
  return props.name ? `Welcome to Agentic CV, ${props.name}` : "Welcome to Agentic CV";
}

export function welcomeText(props: WelcomeProps): string {
  const dashboard = props.dashboardUrl ?? `${appUrl()}/dashboard`;
  const greeting = props.name ? `Hi ${props.name},` : "Hi,";
  return [
    greeting,
    "",
    "Welcome to Agentic CV. Your account is ready.",
    "Build your resume, tailor it to any job, and track applications in one place.",
    "",
    `Get started: ${dashboard}`,
    "",
    "If you did not create this account, just ignore this email.",
  ].join("\n");
}

export default function WelcomeEmail(props: WelcomeProps) {
  const dashboard = props.dashboardUrl ?? `${appUrl()}/dashboard`;
  return (
    <Layout preview="Your Agentic CV account is ready">
      <Text style={headingStyle}>{props.name ? `Welcome, ${props.name}` : "Welcome to Agentic CV"}</Text>
      <Text style={paragraphStyle}>
        Your account is ready. Build your resume, tailor it to any job posting, and track every
        application in one place.
      </Text>
      <Text style={detailBoxStyle}>Start with your dashboard: finish onboarding, add a resume, and browse open roles.</Text>
      <Link href={dashboard} style={buttonStyle}>
        Open your dashboard
      </Link>
      <Text style={mutedStyle}>If you did not create this account, just ignore this email.</Text>
    </Layout>
  );
}
