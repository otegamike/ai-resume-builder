import { Link, Text } from "@react-email/components";
import Layout, { buttonStyle, detailBoxStyle, headingStyle, mutedStyle, paragraphStyle } from "./Layout";
import { appUrl } from "../site";

export interface ApplicationSubmittedProps {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  historyUrl?: string;
}

export function applicationSubmittedSubject(props: ApplicationSubmittedProps): string {
  return `Application sent: ${props.jobTitle}`;
}

export function applicationSubmittedText(props: ApplicationSubmittedProps): string {
  const history = props.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`;
  return [
    `Hi ${props.applicantName},`,
    "",
    `Your application for ${props.jobTitle} at ${props.companyName} has been sent and is under review.`,
    "The employer can now view your resume and cover letter. We will notify you here when the status changes.",
    "",
    `Track it: ${history}`,
  ].join("\n");
}

export default function ApplicationSubmittedEmail(props: ApplicationSubmittedProps) {
  const history = props.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`;
  return (
    <Layout preview={`Your application for ${props.jobTitle} was sent`}>
      <Text style={headingStyle}>Application sent</Text>
      <Text style={paragraphStyle}>
        Hi {props.applicantName}, your application for <strong>{props.jobTitle}</strong> at{" "}
        <strong>{props.companyName}</strong> has been sent and is under review.
      </Text>
      <Text style={detailBoxStyle}>
        The employer can now view your resume and cover letter. We will email you when the status changes.
      </Text>
      <Link href={history} style={buttonStyle}>
        Track your applications
      </Link>
      <Text style={mutedStyle}>Tip: keep your resume up to date so future applications are one click.</Text>
    </Layout>
  );
}
