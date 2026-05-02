// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// const SYSTEM_INSTRUCTION =
//   "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible.";

// export async function generateWithAI(prompt: string): Promise<string> {
//   if (
//     !process.env.GEMINI_API_KEY ||
//     process.env.GEMINI_API_KEY === "your-gemini-api-key-here"
//   ) {
//     throw new Error("Gemini API key not configured");
//   }

//   const response = await ai.models.generateContent({
//     model: "gemini-1.5-flash",
//     contents: prompt,
//     config: {
//       systemInstruction: SYSTEM_INSTRUCTION,
//       temperature: 0.7,
//       maxOutputTokens: 1000,
//     },
//   });

//   return response.text ?? "";
// }


import Groq  from "groq-sdk";

const SYSTEM_INSTRUCTION =
  "You are a professional resume writer. Write concise, impactful content that is ATS-friendly and highlights achievements. Use action verbs and quantify results when possible.";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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


// export async function generateWithAI(prompt: string): Promise<string> {
//   if (
//     !process.env.GEMINI_API_KEY ||
//     process.env.GEMINI_API_KEY === "your-gemini-api-key-here"
//   ) {
//     throw new Error("Gemini API key not configured");
//   }

//   const response = await ai.models.generateContent({
//     model: "gemini-1.5-flash",
//     contents: prompt,
//     config: {
//       systemInstruction: SYSTEM_INSTRUCTION,
//       temperature: 0.7,
//       maxOutputTokens: 1000,
//     },
//   });

//   return response.text ?? "";
// }

export async function generateSummary(
  jobTitle: string,
  experience: string,
  skills: string[]
): Promise<string> {
  const prompt = `Write a professional summary for a ${jobTitle} with ${experience} years of experience. Skills include: ${skills.join(", ")}. Keep it to 3-4 sentences, impactful and ATS-friendly.`;
  return generateWithAI(prompt);
}

export async function generateExperienceBulletPoints(
  company: string,
  role: string,
  description: string
): Promise<string> {
  const prompt = `Transform this job description into 4-6 impactful, ATS-friendly bullet points. Company: ${company}, Role: ${role}. Original description: ${description}. Use action verbs and quantify achievements where possible.`;
  return generateWithAI(prompt);
}

export async function improveSummary(
  existingSummary: string
): Promise<string> {
  const prompt = `Improve this professional summary to make it more impactful and ATS-friendly. Keep it to 3-4 sentences:\n\n${existingSummary}`;
  return generateWithAI(prompt);
}

export async function generateSkillsSuggestions(
  jobTitle: string
): Promise<string[]> {
  const prompt = `List 10-15 relevant technical and soft skills for a ${jobTitle}. Return only a comma-separated list, no explanations.`;
  const result = await generateWithAI(prompt);
  return result
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
