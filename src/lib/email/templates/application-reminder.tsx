import { Link, Text } from "@react-email/components";
import Layout, { buttonStyle, detailBoxStyle, headingStyle, mutedStyle, paragraphStyle } from "./Layout";
import { appUrl } from "../site";

export interface ApplicationReminderProps {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  resumeUrl?: string;
}

export function applicationReminderSubject(props: ApplicationReminderProps): string {
  return `Finish your application for ${props.jobTitle}`;
}

export function applicationReminderText(props: ApplicationReminderProps): string {
  const resume = props.resumeUrl ?? `${appUrl()}/dashboard/jobs`;
  return [
    `Hi ${props.applicantName},`,
    "",
    `You started an application for ${props.jobTitle} at ${props.companyName} but have not submitted it yet.`,
    "Your progress is saved. Finish it before the role closes.",
    "",
    `Resume application: ${resume}`,
    "",
    "You will only ever receive one reminder per application.",
  ].join("\n");
}

export default function ApplicationReminderEmail(props: ApplicationReminderProps) {
  const resume = props.resumeUrl ?? `${appUrl()}/dashboard/jobs`;
  return (
    <Layout preview={`Finish your application for ${props.jobTitle}`}>
      <Text style={headingStyle}>Your application is waiting</Text>
      <Text style={paragraphStyle}>
        Hi {props.applicantName}, you started an application for <strong>{props.jobTitle}</strong> at{" "}
        <strong>{props.companyName}</strong> but have not submitted it yet.
      </Text>
      <Text style={detailBoxStyle}>Your progress is saved. Finish it before the role closes.</Text>
      <Link href={resume} style={buttonStyle}>
        Resume application
      </Link>
      <Text style={mutedStyle}>You will only ever receive one reminder per application.</Text>
    </Layout>
  );
}
