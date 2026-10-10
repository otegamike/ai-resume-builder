import { Link, Text } from "@react-email/components";
import Layout, { buttonStyle, detailBoxStyle, headingStyle, mutedStyle, paragraphStyle } from "./Layout";
import { brand } from "../tokens";
import { appUrl } from "../site";

export type StatusChangeStatus =
  | "under_review"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "rejected";

export interface ApplicationStatusChangedProps {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  status: StatusChangeStatus;
  historyUrl?: string;
  jobsUrl?: string;
}

interface StatusCopy {
  subject: (jobTitle: string) => string;
  heading: string;
  lead: (applicantName: string, jobTitle: string, companyName: string) => string;
  note: string;
}

const STATUS_COPY: Record<StatusChangeStatus, StatusCopy> = {
  under_review: {
    subject: (jobTitle) => `Your application for ${jobTitle} is under review`,
    heading: "Your application is under review",
    lead: (applicantName, jobTitle, companyName) =>
      `Hi ${applicantName}, ${companyName} has started reviewing your application for ${jobTitle}.`,
    note: "We will email you as soon as the status changes.",
  },
  shortlisted: {
    subject: (jobTitle) => `You've been shortlisted for ${jobTitle}`,
    heading: "You've been shortlisted",
    lead: (applicantName, jobTitle, companyName) =>
      `Hi ${applicantName}, great news — ${companyName} shortlisted your application for ${jobTitle}.`,
    note: "Keep an eye on your inbox in case the hiring team reaches out.",
  },
  interviewing: {
    subject: (jobTitle) => `Interview next for ${jobTitle}`,
    heading: "You're at the interview stage",
    lead: (applicantName, jobTitle, companyName) =>
      `Hi ${applicantName}, ${companyName} moved your application for ${jobTitle} to interviews.`,
    note: "Watch your inbox for scheduling details from the hiring team.",
  },
  offered: {
    subject: (jobTitle) => `Offer update for ${jobTitle}`,
    heading: "There's an offer update",
    lead: (applicantName, jobTitle, companyName) =>
      `Hi ${applicantName}, ${companyName} made an offer decision on your application for ${jobTitle}.`,
    note: "Open your dashboard to review the details.",
  },
  rejected: {
    subject: (jobTitle) => `Update on your ${jobTitle} application`,
    heading: "An update on your application",
    lead: (applicantName, jobTitle, companyName) =>
      `Hi ${applicantName}, thanks for applying — ${companyName} decided not to move forward with your application for ${jobTitle} this time.`,
    note: "Every application sharpens the next one. Your resume stays ready for the next role.",
  },
};

export const STATUS_CHANGE_STATUSES = Object.keys(STATUS_COPY) as StatusChangeStatus[];

function copyFor(status: StatusChangeStatus): StatusCopy {
  return STATUS_COPY[status];
}

export function applicationStatusChangedSubject(props: ApplicationStatusChangedProps): string {
  return copyFor(props.status).subject(props.jobTitle);
}

export function applicationStatusChangedText(props: ApplicationStatusChangedProps): string {
  const copy = copyFor(props.status);
  const history = props.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`;
  const lines = [
    copy.lead(props.applicantName, props.jobTitle, props.companyName),
    "",
    copy.note,
    "",
    `Track it: ${history}`,
  ];
  if (props.status === "rejected") {
    lines.push("", `Browse open roles: ${props.jobsUrl ?? `${appUrl()}/jobs`}`);
  }
  return lines.join("\n");
}

export default function ApplicationStatusChangedEmail(props: ApplicationStatusChangedProps) {
  const copy = copyFor(props.status);
  const history = props.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`;
  const jobs = props.jobsUrl ?? `${appUrl()}/jobs`;
  return (
    <Layout preview={copy.subject(props.jobTitle)}>
      <Text style={headingStyle}>{copy.heading}</Text>
      <Text style={paragraphStyle}>
        {copy.lead(props.applicantName, props.jobTitle, props.companyName)}
      </Text>
      <Text style={detailBoxStyle}>{copy.note}</Text>
      <Link href={history} style={buttonStyle}>
        Track your applications
      </Link>
      {props.status === "rejected" ? (
        <Text style={mutedStyle}>
          <Link href={jobs} style={{ color: brand.primaryDark }}>
            Browse open roles
          </Link>{" "}
          when you are ready for the next one.
        </Text>
      ) : null}
    </Layout>
  );
}
