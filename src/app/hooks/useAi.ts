import { useState } from "react";
import { ResumeContent, Experience } from "@/types/ResumeData";
import { useAiCreditStore } from "@/store/useAiCreditStore";
import { useAlertStore } from "@/store/useAlertStore";
import { ApiClientError } from "@/lib/errors/api";
import { handleClientError } from "@/lib/errors/client";

interface AiResult {
    text: string;
    array: string[];
    success: true;
}

interface AiErrorResponse {
    success: false,
    errorMsg: string;
}

export function useAi() {
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiGeneratingFor, setAiGeneratingFor] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string|null>(null);

    const callAI = async (type: string, data: Record<string, unknown>): Promise<string | string[]> => {
        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data }),
        });
        
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = typeof json.error === "string" ? json.error : undefined;
            throw new ApiClientError(
                message || "AI generation failed",
                response.status,
                typeof json.code === "string" ? json.code : undefined
            );
        }

        if (typeof json.newAiCredits === 'number') {
            useAiCreditStore.getState().setCredits(json.newAiCredits);
        }
        
        const result: unknown = json.result;
        if (typeof result === "string") return result;
        if (Array.isArray(result)) {
            return result.filter((item): item is string => typeof item === "string");
        }
        return "";
    };

    const AiWrapper = async (logic: () => Promise<string | string[]>, type: string): Promise<AiResult | AiErrorResponse> =>{
        setAiError(null);
        setAiGenerating(true);
        setAiGeneratingFor(type);
        const result: {string: string , array:  string[]} = {
            string: '',
            array: []
        };

        let success: boolean = false;
        let errorMsg: string = '';

        try{
            const response = await logic();
            if (typeof response === 'string') {
                result.string = response;
            } else {
                result.array = response;
            }

            success = true;
        }catch(error: unknown){
            success = false;
            const userMessage = handleClientError(error, {
                flow: "ai",
                stage: type,
                notify: false,
            });
            errorMsg = userMessage.message;
            setAiError(errorMsg);
            if (error instanceof ApiClientError && error.status === 402) {
                useAlertStore.getState().addAlert("error", errorMsg);
            }
        }finally{
            setAiGenerating(false);
            setAiGeneratingFor(null);
        }
        
        return success ? {text: result.string, array: result.array, success } : { success: false, errorMsg };
    }

    const generateAiSummary = (resume: ResumeContent): Promise<AiResult | AiErrorResponse> => {
        const result = AiWrapper(async () => {
            const experienceYears = resume.experience.length > 0 
                ? resume.experience.reduce((acc, exp) => {
                    const start = parseInt(exp.startDate?.replace(/\D/g, '') || '0');
                    const end = exp.endDate?.toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(exp.endDate?.replace(/\D/g, '') || '0');
                    return acc + (end - start);
                }, 0)
                : 3;
            
            const result = await callAI('generateSummary', {
                jobTitle: resume.personalInfo.jobTitle || 'Professional',
                experience: Math.max(experienceYears, 1),
                skills: resume.skills,
                achivements: resume.experience.flatMap((exp) => exp.description)
            });

            if (!result || typeof result !== "string") {
                throw new Error("our ai encountered an error try again later or try a different summary");
            }

            return result;
            
        }, "summary");
        return result;
    }

    const improveAiSummary = async (summary: string): Promise<AiResult | AiErrorResponse> => {
        return AiWrapper(async () => {
            if (!summary) throw new Error("Can not improve empty summary.");

            const result = await callAI('improveSummary', { summary });
            if (!result || typeof result !== "string") {
                throw new Error("our ai encountered an error try again later or try a different summary");
            }

            return result;
        }, "improveSummary");
    };

    const generateAiSkills = (jobTitle: string): Promise<AiResult | AiErrorResponse> => {
        return AiWrapper(async () => {
            const result = await callAI('generateSkills', {
                 jobTitle
            })

            return result;
            
        }, "generateSkills");
    };

    const generateAiCategorizedSkills = (jobTitle: string): Promise<AiResult | AiErrorResponse> => {
        return AiWrapper(async () => {
            const result = await callAI('generateCategorizedSkills', {
                 jobTitle
            })
            return result;
        }, "generateCategorizedSkills");
    };

    const generateAiCategorizeExistingSkills = (skills: string[]): Promise<AiResult | AiErrorResponse> => {
        return AiWrapper(async () => {
            const result = await callAI('categorizeExistingSkills', { skills });
            return result;
        }, "categorizeExistingSkills");
    };

    const generateAiBulletPoints = (experience: Experience, index: number) => {
        return AiWrapper(async () => {
            if(!experience.company || !experience.role || experience.description.length === 0){
                throw new Error("Can not generate bullet points for experience with missing company, role, or description.");
            }

            const result = await callAI('generateBulletPoints', {
                 company: experience.company,
                 role: experience.role,
                 description: experience.description.join('\n')
            })
            return result;
        }, `generateBulletPoints_${index}`);
    }

    return {
        aiGenerating,
        aiGeneratingFor,
        aiError,
        generateAiSummary,
        improveAiSummary,
        generateAiSkills,
        generateAiCategorizedSkills,
        generateAiCategorizeExistingSkills,
        generateAiBulletPoints,
    };

}