import "server-only";

import { render } from "@react-email/render";
import type { EmailOutboxType } from "@/models/EmailOutbox";
import WelcomeEmail, { welcomeSubject, welcomeText, type WelcomeProps } from "./templates/welcome";
import ApplicationSubmittedEmail, {
  applicationSubmittedSubject,
  applicationSubmittedText,
  type ApplicationSubmittedProps,
} from "./templates/application-submitted";
import ApplicationReceivedEmail, {
  applicationReceivedSubject,
  applicationReceivedText,
  type ApplicationReceivedProps,
} from "./templates/application-received";
import ApplicationReminderEmail, {
  applicationReminderSubject,
  applicationReminderText,
  type ApplicationReminderProps,
} from "./templates/application-reminder";
import ApplicationStatusChangedEmail, {
  applicationStatusChangedSubject,
  applicationStatusChangedText,
  STATUS_CHANGE_STATUSES,
  type ApplicationStatusChangedProps,
  type StatusChangeStatus,
} from "./templates/application-status-changed";
import CandidateMessageEmail, {
  candidateMessageText,
  type CandidateMessageProps,
  type CandidateMessageReplyMode,
} from "./templates/candidate-message";
import { getEmailConfig } from "./config";
import { isValidEmail } from "./dispatcher";
import { appUrl } from "./site";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

function required(value: unknown, name: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`missing_email_prop:${name}`);
  return text;
}

async function renderWelcome(payload: Record<string, unknown>): Promise<RenderedEmail> {
  const props: WelcomeProps = {
    name: String(payload.name ?? ""),
    dashboardUrl: String(payload.dashboardUrl ?? `${appUrl()}/dashboard`),
  };
  return {
    subject: welcomeSubject(props),
    html: await render(<WelcomeEmail {...props} />),
    text: welcomeText(props),
  };
}

async function renderApplicationSubmitted(payload: Record<string, unknown>): Promise<RenderedEmail> {
  const props: ApplicationSubmittedProps = {
    applicantName: required(payload.applicantName, "applicantName"),
    jobTitle: required(payload.jobTitle, "jobTitle"),
    companyName: String(payload.companyName ?? "a company"),
    historyUrl: String(payload.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`),
  };
  return {
    subject: applicationSubmittedSubject(props),
    html: await render(<ApplicationSubmittedEmail {...props} />),
    text: applicationSubmittedText(props),
  };
}

async function renderApplicationReceived(payload: Record<string, unknown>): Promise<RenderedEmail> {
  const props: ApplicationReceivedProps = {
    applicantName: required(payload.applicantName, "applicantName"),
    jobTitle: required(payload.jobTitle, "jobTitle"),
    companyName: String(payload.companyName ?? "a company"),
    reviewUrl: String(payload.reviewUrl ?? `${appUrl()}/dashboard/employers`),
  };
  return {
    subject: applicationReceivedSubject(props),
    html: await render(<ApplicationReceivedEmail {...props} />),
    text: applicationReceivedText(props),
  };
}

async function renderApplicationReminder(payload: Record<string, unknown>): Promise<RenderedEmail> {
  const props: ApplicationReminderProps = {
    applicantName: required(payload.applicantName, "applicantName"),
    jobTitle: required(payload.jobTitle, "jobTitle"),
    companyName: String(payload.companyName ?? "a company"),
    resumeUrl: String(payload.resumeUrl ?? `${appUrl()}/dashboard/jobs`),
  };
  return {
    subject: applicationReminderSubject(props),
    html: await render(<ApplicationReminderEmail {...props} />),
    text: applicationReminderText(props),
  };
}

async function renderApplicationStatusChanged(payload: Record<string, unknown>): Promise<RenderedEmail> {
  const status = String(payload.status ?? "");
  if (!(STATUS_CHANGE_STATUSES as string[]).includes(status)) {
    throw new Error(`missing_email_prop:status`);
  }
  const props: ApplicationStatusChangedProps = {
    applicantName: required(payload.applicantName, "applicantName"),
    jobTitle: required(payload.jobTitle, "jobTitle"),
    companyName: String(payload.companyName ?? "a company"),
    status: status as StatusChangeStatus,
    historyUrl: String(payload.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`),
    jobsUrl: String(payload.jobsUrl ?? `${appUrl()}/jobs`),
  };
  return {
    subject: applicationStatusChangedSubject(props),
    html: await render(<ApplicationStatusChangedEmail {...props} />),
    text: applicationStatusChangedText(props),
  };
}

async function renderCandidateMessage(payload: Record<string, unknown>): Promise<RenderedEmail> {
  const { hiringFrom } = getEmailConfig();
  const rawMode = String(payload.replyMode ?? "hiring");
  const replyMode: CandidateMessageReplyMode =
    rawMode === "custom" || rawMode === "dontreply" ? rawMode : "hiring";

  let replyTo = hiringFrom;
  const addressForMode =
    replyMode === "custom"
      ? String(payload.replyTo ?? "").trim()
      : replyMode === "dontreply"
        ? String(payload.contactEmail ?? "").trim()
        : "";
  if (addressForMode && isValidEmail(addressForMode)) replyTo = addressForMode;

  const subject = required(payload.subject, "subject");
  if (subject.length > 120) throw new Error("email_prop_too_long:subject");
  const messageBody = required(payload.messageBody, "messageBody");
  if (messageBody.length > 5000) throw new Error("email_prop_too_long:messageBody");

  const props: CandidateMessageProps = {
    applicantName: required(payload.applicantName, "applicantName"),
    jobTitle: required(payload.jobTitle, "jobTitle"),
    companyName: String(payload.companyName ?? "a company"),
    messageBody,
    replyMode,
    contactEmail:
      replyMode === "dontreply" && isValidEmail(String(payload.contactEmail ?? ""))
        ? String(payload.contactEmail)
        : undefined,
    historyUrl: String(payload.historyUrl ?? `${appUrl()}/dashboard/jobs?tab=history`),
  };
  return {
    subject,
    html: await render(<CandidateMessageEmail {...props} />),
    text: candidateMessageText({ ...props, subject }),
    from: hiringFrom,
    replyTo,
  };
}

export async function renderEmail(
  type: EmailOutboxType,
  payload: Record<string, unknown>
): Promise<RenderedEmail> {
  switch (type) {
    case "welcome":
      return renderWelcome(payload);
    case "application-submitted":
      return renderApplicationSubmitted(payload);
    case "application-received":
      return renderApplicationReceived(payload);
    case "application-reminder":
      return renderApplicationReminder(payload);
    case "application-status-changed":
      return renderApplicationStatusChanged(payload);
    case "candidate-message":
      return renderCandidateMessage(payload);
    case "job-alert":
      throw new Error("job-alert templates are not enabled");
    default:
      throw new Error(`unknown_email_type:${String(type)}`);
  }
}

/** Sample props for the dev preview route and the live send test. */
export function templateSamples(): Array<{ type: EmailOutboxType; payload: Record<string, unknown> }> {
  return [
    { type: "welcome", payload: { name: "Ada", dashboardUrl: `${appUrl()}/dashboard` } },
    {
      type: "application-submitted",
      payload: { applicantName: "Ada", jobTitle: "Frontend Engineer", companyName: "Acme" },
    },
    {
      type: "application-received",
      payload: { applicantName: "Ada", jobTitle: "Frontend Engineer", companyName: "Acme" },
    },
    {
      type: "application-reminder",
      payload: { applicantName: "Ada", jobTitle: "Frontend Engineer", companyName: "Acme" },
    },
    {
      type: "application-status-changed",
      payload: {
        applicantName: "Ada",
        jobTitle: "Frontend Engineer",
        companyName: "Acme",
        status: "shortlisted",
      },
    },
    {
      type: "candidate-message",
      payload: {
        applicantName: "Ada",
        jobTitle: "Frontend Engineer",
        companyName: "Acme",
        subject: "Next steps for your application",
        messageBody: "Thanks for applying. We would like to schedule a call next week.",
        replyMode: "hiring",
      },
    },
  ];
}
