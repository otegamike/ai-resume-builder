import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AtsResumeView } from "@/lib/atsResumeMapper";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  name: {
    fontSize: 22,
    fontWeight: 600,
    textAlign: "center",
    marginBottom: 18,
  },
  jobTitle: {
    fontSize: 10,
    letterSpacing: 4,
    textTransform: "uppercase",
    textAlign: "center",
    color: "#555",
    marginTop: 8,
  },
  contactLine: {
    fontSize: 9,
    textAlign: "center",
    color: "#555",
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  contactSep: {
    color: "#999",
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 4,
    textTransform: "uppercase",
    fontWeight: 600,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 3,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.65,
    color: "#2a2a2a",
  },
  expEntry: {
    marginBottom: 10,
  },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  expRole: {
    fontSize: 11,
    fontWeight: 600,
  },
  expDates: {
    fontSize: 9,
    color: "#666",
  },
  expCompany: {
    fontSize: 10,
    color: "#555",
    marginBottom: 2,
  },
  expDesc: {
    fontSize: 10,
    lineHeight: 1.65,
    color: "#2a2a2a",
    marginTop: 1,
  },
  eduEntry: {
    marginBottom: 8,
  },
  eduDegree: {
    fontSize: 11,
    fontWeight: 600,
  },
  eduDetail: {
    fontSize: 10,
    color: "#555",
    marginTop: 2,
  },
  projectEntry: {
    marginBottom: 8,
  },
  projectName: {
    fontSize: 11,
    fontWeight: 600,
  },
  projectDesc: {
    fontSize: 10,
    lineHeight: 1.65,
    color: "#2a2a2a",
    marginTop: 1,
  },
  skillText: {
    fontSize: 10,
    color: "#2a2a2a",
  },
  skillCategoryName: {
    fontSize: 10,
    fontWeight: 600,
    marginTop: 4,
    marginBottom: 2,
  },
});

interface AtsMinimalPdfProps {
  data: AtsResumeView;
}

function AtsMinimalPdf({ data }: AtsMinimalPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.jobTitle}>{data.jobTitle}</Text>

        <View style={styles.contactLine}>
          {data.email ? <Text>{data.email}</Text> : null}
          {data.email && (data.phone || data.location || data.website) ? <Text style={styles.contactSep}>|</Text> : null}
          {data.phone ? <Text>{data.phone}</Text> : null}
          {data.phone && (data.location || data.website) ? <Text style={styles.contactSep}>|</Text> : null}
          {data.location ? <Text>{data.location}</Text> : null}
          {data.location && data.website ? <Text style={styles.contactSep}>|</Text> : null}
          {data.website ? <Text>{data.website}</Text> : null}
        </View>

        {data.education.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Education</Text>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.eduEntry}>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                <Text style={styles.eduDetail}>{edu.school} — {edu.startDate} – {edu.endDate}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.experience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.expEntry}>
                <View style={styles.expHeader}>
                  <Text style={styles.expRole}>{exp.role}</Text>
                  <Text style={styles.expDates}>{exp.startDate} – {exp.endDate}</Text>
                </View>
                <Text style={styles.expCompany}>{exp.company}</Text>
                {exp.description.map((desc, j) => (
                  <Text key={j} style={styles.expDesc}>• {desc}</Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {data.projects.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Projects</Text>
            {data.projects.map((proj, i) => (
              <View key={i} style={styles.projectEntry}>
                <Text style={styles.projectName}>{proj.name}</Text>
                {proj.description.map((desc, j) => (
                  <Text key={j} style={styles.projectDesc}>• {desc}</Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {data.skillCategories.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Skills</Text>
            {data.skillCategories.map((cat, i) => (
              <View key={i}>
                <Text style={styles.skillCategoryName}>{cat.category}</Text>
                <Text style={styles.skillText}>
                  {cat.skills.join(", ")}
                </Text>
              </View>
            ))}
          </View>
        ) : data.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Skills</Text>
            <Text style={styles.skillText}>
              {data.skills.join(", ")}
            </Text>
          </View>
        ) : null}

        {data.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Summary</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export default AtsMinimalPdf;
