import type { ReactNode } from "react";
import { Body, Container, Head, Html, Hr, Link, Preview, Section, Text } from "@react-email/components";
import { brand, contentWidth, fontStack } from "../tokens";

interface LayoutProps {
  preview: string;
  children: ReactNode;
  supportEmail?: string;
}

const bodyStyle = {
  backgroundColor: brand.background,
  fontFamily: fontStack,
  margin: "0",
  padding: "24px 12px",
  color: brand.text,
};

const cardStyle = {
  backgroundColor: brand.surface,
  border: `1px solid ${brand.border}`,
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: `${contentWidth}px`,
  padding: "32px",
};

const brandStyle = {
  color: brand.primaryDark,
  fontSize: "20px",
  fontWeight: "700" as const,
  margin: "0 0 16px",
};

const footerStyle = {
  color: brand.muted,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "16px 0 0",
};

export default function Layout({ preview, children, supportEmail }: LayoutProps) {
  const support = supportEmail ?? "support@agenticapp.cv";
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={cardStyle}>
          <Text style={brandStyle}>AgenticApp.cv</Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: brand.border, margin: "24px 0 0" }} />
          <Text style={footerStyle}>
            AgenticApp.cv
            <br />
            Need help? Reply to this email or write to{" "}
            <Link href={`mailto:${support}`} style={{ color: brand.primaryDark }}>
              {support}
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const headingStyle = {
  fontSize: "22px",
  fontWeight: "700" as const,
  margin: "0 0 12px",
  color: brand.text,
};

export const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "23px",
  margin: "0 0 12px",
  color: brand.text,
};

export const mutedStyle = {
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 12px",
  color: brand.muted,
};

export const buttonStyle = {
  backgroundColor: brand.primary,
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "700" as const,
  padding: "12px 24px",
  textDecoration: "none",
};

export const detailBoxStyle = {
  backgroundColor: brand.primarySoft,
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 16px",
};
