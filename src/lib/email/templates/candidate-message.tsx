import { Fragment } from "react";
import { Link, Text } from "@react-email/components";
import Layout, { buttonStyle, detailBoxStyle, headingStyle, mutedStyle, paragraphStyle } from "./Layout";
import { brand } from "../tokens";
import { appUrl } from "../site";

export type CandidateMessageReplyMode = "hiring" | "custom" | "dontreply";

export interface CandidateMessageProps {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  messageBody: string;
  replyMode: CandidateMessageReplyMode;
  contactEmail?: string;
  historyUrl?: string;
}

export function candidateMessageSubject(props: { subject: string }): string {
  return props.subject;
}

function bodyParagraphs(messageBody: string): string[] {
  return messageBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function candidateMessageText(props: CandidateMessageProps & { subject: string }): string {
  const lines = [
    `Hi ${props.applicantName},`,
    "",
    ...bodyParagraphs(props.messageBody).flatMap((paragraph) => [paragraph, ""]),
    `— The hiring team at ${props.companyName} (about your ${props.jobTitle} application)`,
  ];
  if (props.replyMode === "dontreply") {
    lines.push("", "Please do not reply to this automated message.");
    if (props.contactEmail) lines.push(`Contact: ${props.contactEmail}`);
  }
  lines.push("", `Track your applications: ${props.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`}`);
  return lines.join("\n");
}

export default function CandidateMessageEmail(props: CandidateMessageProps) {
  const history = props.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`;
  return (
    <Layout preview={`A message about your ${props.jobTitle} application`}>
      <Text style={headingStyle}>A message about your application</Text>
      <Text style={paragraphStyle}>
        Hi {props.applicantName}, the hiring team at <strong>{props.companyName}</strong> sent you
        this message about your <strong>{props.jobTitle}</strong> application:
      </Text>
      {props.replyMode === "dontreply" ? (
        <Text style={detailBoxStyle}>Please do not reply to this automated message.</Text>
      ) : null}
      {bodyParagraphs(props.messageBody).map((paragraph, index) => (
        <Fragment key={index}>
          <Text style={paragraphStyle}>{paragraph}</Text>
        </Fragment>
      ))}
      <Text style={mutedStyle}>
        — The hiring team at {props.companyName}
        {props.replyMode === "dontreply" && props.contactEmail ? (
          <Fragment>
            {" "}
            · Contact:{" "}
            <Link href={`mailto:${props.contactEmail}`} style={{ color: brand.primaryDark }}>
              {props.contactEmail}
            </Link>
          </Fragment>
        ) : null}
      </Text>
      <Link href={history} style={buttonStyle}>
        Track your applications
      </Link>
    </Layout>
  );
}
