import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Sparkles, CircleX } from "lucide-react";
import styles from "../page.module.css";

interface SkillsTabProps {
  skills: string[];
  jobTitle: string;
  newSkill: string;
  setNewSkill: (val: string) => void;
  addSkill: () => void;
  removeSkill: (skill: string) => void;
  generateAISkills: () => void;
  aiGenerating: boolean;
  aiGeneratingFor: string | null;
}

export default function SkillsTab({
  skills,
  jobTitle,
  newSkill,
  setNewSkill,
  addSkill,
  removeSkill,
  generateAISkills,
  aiGenerating,
  aiGeneratingFor,
}: SkillsTabProps) {
  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>Technical Skills</h2>
        <Button
          variant="ai"
          size="sm"
          onClick={generateAISkills}
          disabled={aiGenerating || !jobTitle}
          className={styles.aiButton}
          title={!jobTitle ? "Enter a job title first" : "Generate skills based on your job title"}
        >
          {aiGeneratingFor === "generateSkills" ? (
            <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} />
          ) : (
            <Sparkles className={styles.aiButtonIcon} />
          )}
          {aiGeneratingFor === "generateSkills" ? "Generating..." : "AI Suggestions"}
        </Button>
      </div>
      <div className={styles.skillsContainer}>
        <Input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          placeholder="e.g., React.js"
          className={`${styles.input} ${styles.skillsInput}`}
          onKeyDown={(e) => e.key === "Enter" && addSkill()}
        />
        <Button onClick={addSkill} className={styles.skillsAddButton} disabled={!newSkill.trim()||skills.length >= 12}>
          Add
        </Button>
      </div>
      {skills.length <= 12 ? (
        <span className={styles.skillsHint} style={{fontSize: 'small', color: 'var(--neutral-500)'}}>
          Up to 12 skills. Press Enter or click Add.
        </span>
      ) : (
        <span className={styles.skillsHint} style={{fontSize: 'small', color: 'var(--neutral-500)'}}>
          Only the first 12 skills will appear on your resume. Please remove any irrelevant skills.
        </span>
      )}

      <div className={styles.skillsList}>
        {skills.map((skill, index) => (
          <div key={skill} className={styles.skillTag} style={index >= 12 ? {opacity: 0.5} : {}}>
            {skill}
            <button onClick={() => removeSkill(skill)} className={`${styles.skillRemoveButton}`}>
              <CircleX className={styles.skillRemoveIcon} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
