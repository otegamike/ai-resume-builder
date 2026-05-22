import React from "react";
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { TEMPLATE_PAGE, type TemplateId } from "@/lib/templateCatalog";
import type { PdfRenderModel } from "@/lib/pdf/types";
import { resolvePdfTemplate } from "@/lib/pdf/themes";
import { mapTemplateSpecToStyles } from "@/lib/pdf/styleMapper";
import { registerPdfFonts } from "@/lib/pdf/fonts";

interface ResumePdfDocumentProps {
  resume: PdfRenderModel;
  templateId: TemplateId;
}

function ContactBlock({ resume, styles }: { resume: PdfRenderModel; styles: ReturnType<typeof StyleSheet.create> }) {
  const { email, phone, location, website } = resume.personalInfo;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contact</Text>
      {email ? <Text style={styles.muted}>{email}</Text> : null}
      {phone ? <Text style={styles.muted}>{phone}</Text> : null}
      {location ? <Text style={styles.muted}>{location}</Text> : null}
      {website ? (
        <Link src={website.startsWith("http") ? website : `https://${website}`} style={styles.muted}>
          {website}
        </Link>
      ) : null}
    </View>
  );
}

function SummaryBlock({ resume, styles }: { resume: PdfRenderModel; styles: ReturnType<typeof StyleSheet.create> }) {
  if (!resume.hasSummary) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Summary</Text>
      <Text style={styles.text}>{resume.summary}</Text>
    </View>
  );
}

function SkillsBlock({
  resume,
  styles,
  bulletPrefix,
}: {
  resume: PdfRenderModel;
  styles: ReturnType<typeof StyleSheet.create>;
  bulletPrefix: string;
}) {
  if (!resume.hasSkills) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Skills</Text>
      {resume.skills.map((skill, index) => (
        <View key={`${skill}-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>{bulletPrefix}</Text>
          <Text style={styles.skill}>{skill}</Text>
        </View>
      ))}
    </View>
  );
}

function ExperienceBlock({
  resume,
  styles,
  bulletPrefix,
  entrySeparator,
}: {
  resume: PdfRenderModel;
  styles: ReturnType<typeof StyleSheet.create>;
  bulletPrefix: string;
  entrySeparator: boolean;
}) {
  if (!resume.hasExperience) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experience</Text>
      {resume.experience.map((entry) => (
        <View key={entry.id} style={styles.itemWrap} wrap={false}>
          {(entry.company || entry.role) ? (
            <Text style={styles.itemHeading}>{[entry.role, entry.company].filter(Boolean).join(" at ")}</Text>
          ) : null}
          {entry.period ? <Text style={styles.itemSubheading}>{entry.period}</Text> : null}
          {entry.description.map((line, index) => (
            <View key={`${entry.id}-line-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletSymbol}>{bulletPrefix}</Text>
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
          {entrySeparator ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  );
}

function EducationBlock({
  resume,
  styles,
  entrySeparator,
}: {
  resume: PdfRenderModel;
  styles: ReturnType<typeof StyleSheet.create>;
  entrySeparator: boolean;
}) {
  if (!resume.hasEducation) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Education</Text>
      {resume.education.map((entry) => (
        <View key={entry.id} style={styles.itemWrap} wrap={false}>
          {(entry.degree || entry.school) ? <Text style={styles.itemHeading}>{[entry.degree, entry.school].filter(Boolean).join(", ")}</Text> : null}
          {entry.period ? <Text style={styles.itemSubheading}>{entry.period}</Text> : null}
          {entrySeparator ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  );
}

export function ResumePdfDocument({ resume, templateId }: ResumePdfDocumentProps) {
  registerPdfFonts();
  const resolvedTemplate = resolvePdfTemplate(templateId);
  const mappedStyles = mapTemplateSpecToStyles(resolvedTemplate.style);
  const styles = StyleSheet.create(mappedStyles);

  const title = resolvedTemplate.layout.showTitleUppercase
    ? resume.personalInfo.jobTitle?.toUpperCase()
    : resume.personalInfo.jobTitle;

  const summary = resume.hasSummary ? (
    <SummaryBlock resume={resume} styles={styles} />
  ) : null;

  const education = (
    <EducationBlock resume={resume} styles={styles} entrySeparator={resolvedTemplate.layout.entrySeparator} />
  );

  const experience = (
    <ExperienceBlock
      resume={resume}
      styles={styles}
      bulletPrefix={resolvedTemplate.layout.bulletPrefix}
      entrySeparator={resolvedTemplate.layout.entrySeparator}
    />
  );

  return (
    <Document title={`${resume.personalInfo.name || "Resume"} Resume`}>
      <Page
        size={[TEMPLATE_PAGE.widthPx, TEMPLATE_PAGE.heightPx]}
        style={styles.page}
      >
        <View style={styles.root}>
          <View style={styles.sidebar}>
            {resolvedTemplate.layout.showPhoto && resume.personalInfo.photo ? (
              <Image src={resume.personalInfo.photo} style={styles.photo} alt="Candidate photo" />
            ) : null}
            <Text style={styles.name}>{resume.personalInfo.name || "Unnamed Candidate"}</Text>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <View style={styles.divider} />
            {resolvedTemplate.layout.contactInSidebar ? <ContactBlock resume={resume} styles={styles} /> : null}
            {resolvedTemplate.layout.skillsInSidebar ? (
              <SkillsBlock resume={resume} styles={styles} bulletPrefix={resolvedTemplate.layout.bulletPrefix} />
            ) : null}
            {!resolvedTemplate.layout.summaryInMain ? summary : null}
          </View>

          <View style={styles.main}>
            {resolvedTemplate.layout.summaryInMain ? summary : null}
            {resolvedTemplate.layout.educationFirst ? education : experience}
            {resolvedTemplate.layout.educationFirst ? experience : education}
            {!resolvedTemplate.layout.skillsInSidebar ? (
              <SkillsBlock resume={resume} styles={styles} bulletPrefix={resolvedTemplate.layout.bulletPrefix} />
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
