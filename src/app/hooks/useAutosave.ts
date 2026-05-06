import { useState, useCallback, useEffect } from "react";
import { ResumeContent } from "@/types/ResumeData";
import { TemplateId } from "@/lib/templateCatalog";

function debounce(func: (...args: [string, ResumeContent]) => void, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = (...args: [string, ResumeContent]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
  
  (debounced as typeof debounced & { cancel: () => void }).cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  
  return debounced as typeof debounced & { cancel: () => void };
}

export function useAutoSave(
  initialResumeId: string,
  initialTemplateId: TemplateId,
  wait: number
) {
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saving, setSaving] = useState<boolean>(false);
  const [resumeId, setResumeId] = useState<string>(initialResumeId);
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplateId);

  const updateResumeId = (newResumeId: string ) => {
    setResumeId(newResumeId);
  }

  const updateTemplateId = (newTemplateId: TemplateId) => {
    setTemplateId(newTemplateId);
  }

  const saveResume = useCallback(async (titleToSave: string, resume: ResumeContent, newTemplateId?: TemplateId) => {
    debouncedAutoSave.cancel();
    setSaving(true);
    const newResume = resumeId==='new';
    const apiUrl = newResume ? `/api/resumes` : `/api/resumes/${resumeId}`;
    const method = newResume ? 'POST' : 'PUT';
    
    setAutoSaveStatus("saving");
    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave, content: resume , template: newTemplateId || templateId}),
      });

      if (!response.ok) {
        throw new Error('Auto-save failed');
      }
      
      if (newResume) {
        const data: {id: string, content: ResumeContent} = await response.json();
        updateResumeId(data.id);
      }

      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch {
      setAutoSaveStatus("error");
    }
    setSaving(false);
  }, [resumeId, templateId]);

  const autoSaveResume = useCallback(async (title: string, resume: ResumeContent) => {
      if (resumeId === 'new') return;

      await saveResume(title, resume);

    }, [resumeId, templateId]);

  const debouncedAutoSave = useCallback(
      debounce((titleToSave: string, resumeToSave: ResumeContent) => {
        autoSaveResume(titleToSave, resumeToSave);
      }, wait),
      [autoSaveResume]
    );
  
    useEffect(() => {
      return () => {
        debouncedAutoSave.cancel();
      };
    }, [debouncedAutoSave]);

  return {
    resumeId,
    templateId,
    saving,
    autoSaveStatus,
    debouncedAutoSave,
    saveResume,
    updateResumeId,
    updateTemplateId,
    setAutoSaveStatus,
  };
}
