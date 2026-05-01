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
          variant="outline"
          size="sm"
          onClick={generateAISkills}
          disabled={aiGenerating || !jobTitle}
          className={styles.aiButton}
          title={!jobTitle ? "Enter a job title first" : "Generate skills based on your job title"}
        >
          {aiGeneratingFor === "skills" ? (
            <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} />
          ) : (
            <Sparkles className={styles.aiButtonIcon} />
          )}
          {aiGeneratingFor === "skills" ? "Generating..." : "AI Suggestions"}
        </Button>
      </div>
      <div className={styles.skillsContainer}>
        <Input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          placeholder="e.g. React.js"
          className={`${styles.input} ${styles.skillsInput}`}
          onKeyDown={(e) => e.key === "Enter" && addSkill()}
        />
        <Button onClick={addSkill} className={styles.skillsAddButton}>
          Add
        </Button>
      </div>
      <div className={styles.skillsList}>
        {skills.map((skill) => (
          <div key={skill} className={styles.skillTag}>
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
