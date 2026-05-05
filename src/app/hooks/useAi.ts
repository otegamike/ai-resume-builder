import { useState } from "react";
import { ResumeContent, Experience } from "@/types/ResumeData";

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
        
        if (!response.ok) throw new Error('AI generation failed');
        const result = await response.json();
        return result.result;
    };

    const AiWrapper = async (logic: () => Promise<string | string[]>, type: string): Promise<AiResult | AiErrorResponse> =>{
        setAiError(null);
        setAiGenerating(true);
        setAiGeneratingFor(type);
        let result: {string: string , array:  string[]} = {
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
        }catch(error: any){
            success = false;
            errorMsg = error.message;
            setAiError(errorMsg);
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
        }, `generateBulletPoints-${index}`);
    }

    return {
        aiGenerating,
        aiGeneratingFor,
        aiError,
        generateAiSummary,
        improveAiSummary,
        generateAiSkills,
        generateAiBulletPoints,
    };

}