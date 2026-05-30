
import Groq  from "groq-sdk";
import { AtsReport } from "@/types/AtsReport";
import { ResumeContent } from "@/types/ResumeData";

const SYSTEM_INSTRUCTION =
  "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible.";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const emptyResumeContent: ResumeContent = {
  personalInfo: {
    name: "",
    fullname: { firstName: "", otherNames: "" },
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
};

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseJsonObject<T>(value: string): T {
  const cleaned = stripJsonFence(value);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("AI returned invalid JSON");
  }
}

function stringifyListItem(item: unknown): string {
  if (typeof item === "string") {
    return item.trim();
  }

  if (typeof item === "number" || typeof item === "boolean") {
    return String(item);
  }

  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const primary = ["description", "detail", "title", "field", "name", "keyword"]
      .map((key) => record[key])
      .find((value) => typeof value === "string" && value.trim());

    if (typeof primary === "string") {
      const field = typeof record.field === "string" ? record.field.trim() : "";
      const text = primary.trim();
      return field && field !== text ? `${field}: ${text}` : text;
    }

    return JSON.stringify(item);
  }

  return "";
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(stringifyListItem).filter(Boolean);
}

function normalizeResumeContent(content: Partial<ResumeContent> | undefined): ResumeContent {
  return {
    personalInfo: {
      ...emptyResumeContent.personalInfo,
      ...(content?.personalInfo ?? {}),
      fullname: {
        ...emptyResumeContent.personalInfo.fullname,
        ...(content?.personalInfo?.fullname ?? {}),
      },
    },
    summary: content?.summary ?? "",
    experience: Array.isArray(content?.experience) ? content.experience : [],
    education: Array.isArray(content?.education) ? content.education : [],
    skills: normalizeStringList(content?.skills),
  };
}

function normalizeAtsReport(report: Partial<AtsReport>, extractedText: string): AtsReport {
  return {
    score: Math.max(0, Math.min(100, Number(report.score) || 0)),
    verdict: report.verdict || "ATS review completed.",
    strengths: normalizeStringList(report.strengths),
    issues: Array.isArray(report.issues) ? report.issues : [],
    recommendedKeywords: normalizeStringList(report.recommendedKeywords),
    extractedText: report.extractedText || extractedText,
    parsedResume: normalizeResumeContent(report.parsedResume),
    improvedResume: normalizeResumeContent(report.improvedResume),
  };
}

export async function generateWithAI(prompt: string): Promise<string> {
   if (
    !process.env.GROQ_API_KEY ||process.env.GROQ_API_KEY === "your-groq-api-key-here"

  ) {
    throw new Error("Groq API key not configured");
  }
  
  try {
    const completion = await getGroqChatCompletion(prompt);
    console.log(completion.choices[0]?.message?.content || "");
    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.log(error)
    return "error"
  }
  

}

export async function extractResumeTextFromImages(dataUrls: string[]): Promise<string> {
  if (
    !process.env.GROQ_API_KEY ||
    process.env.GROQ_API_KEY === "your-groq-api-key-here"
  ) {
    throw new Error("Groq API key not configured");
  }

  if (dataUrls.length === 0) {
    return "";
  }

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all readable resume/CV text from these image page(s). Preserve section headings, dates, contact details, skills, and bullet points in page order. Return only the extracted text.",
          },
          ...dataUrls.map((dataUrl) => ({
            type: "image_url" as const,
            image_url: {
              url: dataUrl,
            },
          })),
        ],
      },
    ],
    model: VISION_MODEL,
    temperature: 0.1,
    max_completion_tokens: 4096,
    top_p: 1,
    stream: false,
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

export async function extractResumeTextFromImage(dataUrl: string): Promise<string> {
  return extractResumeTextFromImages([dataUrl]);
}

export async function analyzeResumeForAts(
  extractedText: string,
  existingResume?: ResumeContent
): Promise<AtsReport> {
  const knownResumeBlock = existingResume
    ? `\nExisting structured resume JSON:\n${JSON.stringify(existingResume, null, 2)}`
    : "";

  const prompt = `You are an expert ATS resume reviewer and resume writer.

Analyze this resume/CV, extract or normalize it into the ResumeContent schema, flag ATS issues, and create an improved but truthful version.

Rules:
- Return valid JSON only. No markdown, no explanations outside JSON.
- Score must be an integer from 0 to 100.
- Do not invent companies, schools, certifications, dates, degrees, or contact details.
- Improve wording, clarity, ATS keywords, and bullet impact while preserving facts.
- If a field is missing, use an empty string or empty array.
- strengths, recommendedKeywords, and skills must be arrays of strings only.
- Every experience item needs id, company, role, startDate, endDate, description string[].
- Every education item needs id, school, degree, startDate, endDate.
- personalInfo must include name, fullname { firstName, otherNames }, jobTitle, email, phone, location, website.

Return this exact JSON shape:
{
  "score": 0,
  "verdict": "",
  "strengths": [],
  "issues": [
    {
      "severity": "high",
      "section": "experience",
      "title": "",
      "detail": "",
      "suggestion": ""
    }
  ],
  "recommendedKeywords": [],
  "extractedText": "",
  "parsedResume": {
    "personalInfo": {
      "name": "",
      "fullname": { "firstName": "", "otherNames": "" },
      "jobTitle": "",
      "email": "",
      "phone": "",
      "location": "",
      "website": ""
    },
    "summary": "",
    "experience": [],
    "education": [],
    "skills": []
  },
  "improvedResume": {
    "personalInfo": {
      "name": "",
      "fullname": { "firstName": "", "otherNames": "" },
      "jobTitle": "",
      "email": "",
      "phone": "",
      "location": "",
      "website": ""
    },
    "summary": "",
    "experience": [],
    "education": [],
    "skills": []
  }
}

Resume text:
${extractedText}
${knownResumeBlock}`;

  const raw = await generateWithAI(prompt);
  if (!raw || raw === "error") {
    throw new Error("AI ATS analysis failed");
  }

  return normalizeAtsReport(parseJsonObject<Partial<AtsReport>>(raw), extractedText);
}

export const getGroqChatCompletion = async (prompt:string) => {
  return groq.chat.completions.create({
    messages: [
      // Set an optional system message. This sets the behavior of the
      // assistant and can be used to provide specific instructions for
      // how it should behave throughout the conversation.
      {
        role: "system",
        content: SYSTEM_INSTRUCTION,
      },
      // Set a user message for the assistant to respond to.
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.1-8b-instant",
  });
};


export async function generateSummary(
  jobTitle: string,
  experience: string,
  skills: string[],
  achivements:string[]
): Promise<string> {
  const prompt = `Write a professional summary for a ${jobTitle} with ${experience} years of experience. Skills include: ${skills.join(", ")}. this is a bullet point of their achivements.\n - ${achivements.join("\n - ")} . Keep it very short and just in one sentences, impactful and ATS-friendly. Return only the professional summary, no explanations.`;
  return generateWithAI(prompt);
}

export async function generateExperienceBulletPoints(
  company: string,
  role: string,
  description: string
): Promise<string[]> {
  const prompt = `Transform this job description into 3 impactful, ATS-friendly bullet points. Company: ${company}, Role: ${role}. Original description: ${description}. Use action verbs and quantify achievements where possible. Return only the bullet points, one per line. no explanations.`;
  const result = await generateWithAI(prompt);
  console.log(result)
  return result
    .split("\n")
    .map((s) => s.trim().replace(/^[-•–—*]\s*/, ""))
    .filter((s) => s.length > 0);
}

export async function improveSummary(
  existingSummary: string
): Promise<string> {
  const prompt = `Improve this professional summary to make it more impactful and ATS-friendly. Keep it very short and just in one sentences.\n\n${existingSummary}. Return only professional summary, no explanations.`;
  return generateWithAI(prompt);
}

export async function generateSkillsSuggestions(
  jobTitle: string
): Promise<string[]> {
  const prompt = `List 8-10 relevant technical and soft skills for a ${jobTitle}. Return only a comma-separated list, no explanations.`;
  const result = await generateWithAI(prompt);
  return result
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
