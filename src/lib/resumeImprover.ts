import { ResumeContent } from "@/types/ResumeData";
import { AppError } from "@/lib/errors/AppError";
import { MAX_PDF_BYTES, MAX_PDF_MB } from "@/lib/pdfConstants";

export const allowedResumeUploadTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function assertSupportedUpload(file: File) {
  if (!allowedResumeUploadTypes.includes(file.type)) {
    throw new AppError("Upload a PNG, JPG, JPEG, or WEBP resume.", {
      status: 400,
      code: "UNSUPPORTED_UPLOAD_TYPE",
      userMessage: "Upload a PNG, JPG, JPEG, or WEBP resume.",
    });
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new AppError(`Resume uploads must be ${MAX_PDF_MB}MB or smaller.`, {
      status: 400,
      code: "UPLOAD_TOO_LARGE",
      userMessage: `Resume uploads must be ${MAX_PDF_MB}MB or smaller.`,
    });
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
