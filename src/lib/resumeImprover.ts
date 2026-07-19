import { ResumeContent } from "@/types/ResumeData";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const allowedResumeUploadTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function assertSupportedUpload(file: File) {
  if (!allowedResumeUploadTypes.includes(file.type)) {
    throw new Error("Upload a PNG, JPG, JPEG, or WEBP resume.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Resume uploads must be 10MB or smaller.");
  }
}

export async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export function resumeContentToText(content: ResumeContent) {
  const sections = [
    content.personalInfo.name,
    content.personalInfo.jobTitle,
    content.personalInfo.email,
    content.personalInfo.phone,
    content.personalInfo.location,
    content.personalInfo.website,
    content.summary,
    ...content.experience.flatMap((experience) => [
      experience.role,
      experience.company,
      `${experience.startDate} - ${experience.endDate}`,
      ...experience.description,
    ]),
    ...content.education.flatMap((education) => [
      education.degree,
      education.school,
      `${education.startDate} - ${education.endDate}`,
    ]),
    ...(content.projects ?? []).flatMap((project) => [
      `Project: ${project.name}`,
      ...project.description,
    ]),
  ];

  if (content.skillCategorized && content.skillCategories?.length) {
    sections.push(
      ...content.skillCategories.flatMap(
        (cat) => `${cat.category}: ${cat.skills.join(", ")}`
      )
    );
  } else {
    sections.push(content.skills.join(", "));
  }

  return sections.filter(Boolean).join("\n").trim();
}
