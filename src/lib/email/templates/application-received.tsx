import { Link, Text } from "@react-email/components";
import Layout, { buttonStyle, detailBoxStyle, headingStyle, mutedStyle, paragraphStyle } from "./Layout";
import { appUrl } from "../site";

export interface ApplicationReceivedProps {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  reviewUrl?: string;
}

export function applicationReceivedSubject(props: ApplicationReceivedProps): string {
  return `New applicant for ${props.jobTitle}: ${props.applicantName}`;
}

export function applicationReceivedText(props: ApplicationReceivedProps): string {
  const review = props.reviewUrl ?? `${appUrl()}/dashboard/employers`;
  return [
    `Hi ${props.companyName} team,`,
    "",
    `${props.applicantName} just applied for ${props.jobTitle}.`,
    "Open your employer dashboard to review the resume, cover letter, and screening answers.",
    "",
    `Review: ${review}`,
  ].join("\n");
}

export default function ApplicationReceivedEmail(props: ApplicationReceivedProps) {
  const review = props.reviewUrl ?? `${appUrl()}/dashboard/employers`;
  return (
    <Layout preview={`${props.applicantName} applied for ${props.jobTitle}`}>
      <Text style={headingStyle}>New application</Text>
      <Text style={paragraphStyle}>
        <strong>{props.applicantName}</strong> just applied for <strong>{props.jobTitle}</strong> at{" "}
        {props.companyName}.
      </Text>
      <Text style={detailBoxStyle}>
        Review the resume, cover letter, and screening answers in your employer dashboard.
      </Text>
      <Link href={review} style={buttonStyle}>
        Review application
      </Link>
      <Text style={mutedStyle}>Fast responses get more hires: candidates see when their status changes.</Text>
    </Layout>
  );
}
