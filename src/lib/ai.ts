import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateWithAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-api-key-here") {
    throw new Error("OpenAI API key not configured");
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function generateSummary(jobTitle: string, experience: string, skills: string[]): Promise<string> {
  const prompt = `Write a professional summary for a ${jobTitle} with ${experience} years of experience. Skills include: ${skills.join(", ")}. Keep it to 3-4 sentences, impactful and ATS-friendly.`;
  return generateWithAI(prompt);
}

export async function generateExperienceBulletPoints(company: string, role: string, description: string): Promise<string> {
  const prompt = `Transform this job description into 4-6 impactful, ATS-friendly bullet points. Company: ${company}, Role: ${role}. Original description: ${description}. Use action verbs and quantify achievements where possible.`;
  return generateWithAI(prompt);
}

export async function improveSummary(existingSummary: string): Promise<string> {
  const prompt = `Improve this professional summary to make it more impactful and ATS-friendly. Keep it to 3-4 sentences:\n\n${existingSummary}`;
  return generateWithAI(prompt);
}

export async function generateSkillsSuggestions(jobTitle: string): Promise<string[]> {
  const prompt = `List 10-15 relevant technical and soft skills for a ${jobTitle}. Return only a comma-separated list, no explanations.`;
  const result = await generateWithAI(prompt);
  return result.split(",").map(s => s.trim()).filter(s => s.length > 0);
}
