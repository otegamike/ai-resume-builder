import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AtsResumeView } from "@/lib/atsResumeMapper";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#d4d4d4",
    lineHeight: 1.4,
    backgroundColor: "#1a1a2e",
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
    color: "#ffffff",
    marginBottom: 18,
  },
  jobTitle: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    color: "#8899aa",
    marginTop: 6,
  },
  contactLine: {
    fontSize: 9,
    textAlign: "center",
    color: "#cccccc",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  contactSep: {
    color: "#7ec8e3",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4e",
    marginVertical: 14,
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: 700,
    color: "#7ec8e3",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#3a5a7a",
    paddingBottom: 4,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#d4d4d4",
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
    fontWeight: 700,
    color: "#ffffff",
  },
  expDates: {
    fontSize: 9,
    color: "#778899",
  },
  expCompany: {
    fontSize: 10,
    color: "#aabbcc",
    fontWeight: 600,
    marginBottom: 2,
  },
  expDesc: {
    fontSize: 10,
    lineHeight: 1.55,
    color: "#d4d4d4",
    marginTop: 1,
  },
  eduEntry: {
    marginBottom: 8,
  },
  eduDegree: {
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
  },
  eduDetail: {
    fontSize: 10,
    color: "#8899aa",
    marginTop: 2,
  },
  projectEntry: {
    marginBottom: 8,
  },
  projectName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
  },
  projectDesc: {
    fontSize: 10,
    lineHeight: 1.55,
    color: "#d4d4d4",
    marginTop: 1,
  },
  skillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillItem: {
    fontSize: 10,
    color: "#d4d4d4",
  },
  skillCategoryName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    marginTop: 4,
    marginBottom: 2,
  },
});

interface AtsDarkPdfProps {
  data: AtsResumeView;
}

function AtsDarkPdf({ data }: AtsDarkPdfProps) {
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

        {data.skillCategories.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Skills</Text>
            {data.skillCategories.map((cat, i) => (
              <View key={i}>
                <Text style={styles.skillCategoryName}>{cat.category}</Text>
                <View style={styles.skillRow}>
                  {cat.skills.map((s, j) => (
                    <Text key={j} style={styles.skillItem}>{s}{j < cat.skills.length - 1 ? ", " : ""}</Text>
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : data.skills.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Skills</Text>
            <View style={styles.skillRow}>
              {data.skills.map((s, i) => (
                <Text key={i} style={styles.skillItem}>{s}{i < data.skills.length - 1 ? ", " : ""}</Text>
              ))}
            </View>
          </>
        ) : null}

        {data.education.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Education</Text>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.eduEntry}>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                <Text style={styles.eduDetail}>{edu.school} — {edu.startDate} – {edu.endDate}</Text>
              </View>
            ))}
          </>
        ) : null}

        {data.experience.length > 0 ? (
          <>
            <View style={styles.divider} />
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
          </>
        ) : null}

        {data.projects.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Projects</Text>
            {data.projects.map((proj, i) => (
              <View key={i} style={styles.projectEntry}>
                <Text style={styles.projectName}>{proj.name}</Text>
                {proj.description.map((desc, j) => (
                  <Text key={j} style={styles.projectDesc}>• {desc}</Text>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {data.summary ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Summary</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </>
        ) : null}
      </Page>
    </Document>
  );
}

export default AtsDarkPdf;
