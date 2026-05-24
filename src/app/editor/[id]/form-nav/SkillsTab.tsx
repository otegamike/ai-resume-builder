import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Sparkles, CircleX, Plus, AlertCircle } from "lucide-react";
import { maxSkillCount } from "@/constants/ResumeConstants";
import styles from "../page.module.css";

interface SkillsTabProps {
  skills: string[];
  aiSuggestedSkills: string[];
  jobTitle: string;
  newSkill: string;
  setNewSkill: (val: string) => void;
  addSkill: () => void;
  removeSkill: (skill: string) => void;
  addSkillFromSuggestion: (skill: string) => void;
  removeSuggestedSkill: (skill: string) => void;
  generateAISkills: () => void;
  aiGenerating: boolean;
  aiGeneratingFor: string | null;
  skillsError: string;
  setSkillsError: (val: string) => void;
}

export default function SkillsTab({
  skills,
  aiSuggestedSkills,
  jobTitle,
  newSkill,
  setNewSkill,
  addSkill,
  removeSkill,
  addSkillFromSuggestion,
  removeSuggestedSkill,
  generateAISkills,
  aiGenerating,
  aiGeneratingFor,
  skillsError,
  setSkillsError,
}: SkillsTabProps) {
  const isLimitReached = skills.length >= maxSkillCount;
  const isNearLimit = skills.length >= maxSkillCount - 2;
  const percentage = Math.min(100, (skills.length / maxSkillCount) * 100);

  const suggestedCardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (aiSuggestedSkills.length > 0 && suggestedCardRef.current) {
      suggestedCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [aiSuggestedSkills]);

  return (
    <div className={styles.formSection}>
      {/* Header with AI Suggestions Trigger */}
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

      {/* Selected Skills Section Card */}
      <div className={styles.skillsSectionCard}>
        <div className={styles.skillsSectionCardHeader}>
          <span className={styles.skillsSectionCardTitle}>Skills on Resume</span>
          <span className={`${styles.skillsCountBadge} ${isLimitReached ? styles.skillsCountBadgeMax : isNearLimit ? styles.skillsCountBadgeWarning : ""}`}>
            {skills.length} / {maxSkillCount}
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className={styles.skillsProgressBarContainer}>
          <div 
            className={`${styles.skillsProgressBar} ${isLimitReached ? styles.skillsProgressBarMax : isNearLimit ? styles.skillsProgressBarWarning : ""}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Input area */}
        <div className={styles.skillsContainer}>
          <Input
            value={newSkill}
            onChange={(e) => {
              setNewSkill(e.target.value);
              if (skillsError) setSkillsError(""); // Clear validation error on type
            }}
            placeholder={isLimitReached ? "Skill limit reached" : "e.g., React.js"}
            className={`${styles.input} ${styles.skillsInput}`}
            onKeyDown={(e) => e.key === "Enter" && addSkill()}
            disabled={isLimitReached}
          />
          <Button 
            onClick={addSkill} 
            className={styles.skillsAddButton} 
            disabled={!newSkill.trim() || isLimitReached}
          >
            Add
          </Button>
        </div>

        <span className={styles.skillsHint} style={{ fontSize: 'small', color: 'var(--neutral-500)' }}>
          {isLimitReached ? "Remove a skill to add more." : "Press Enter or click Add."}
        </span>

        {/* Limit Warning Banner */}
        {(skillsError || isLimitReached) && (
          <div className={`${styles.skillsWarningBanner} animate-fade-in`}>
            <AlertCircle className={styles.skillsWarningIcon} />
            <span className={styles.skillsWarningText}>
              {skillsError || `Maximum of ${maxSkillCount} skills allowed to ensure optimal resume layout alignment and formatting.`}
            </span>
          </div>
        )}

        {/* Selected Skills Tags List */}
        {skills.length > 0 ? (
          <div className={styles.skillsList}>
            {skills.map((skill) => (
              <div key={skill} className={styles.skillTag}>
                {skill}
                <button 
                  onClick={() => removeSkill(skill)} 
                  className={styles.skillRemoveButton}
                  title="Remove skill"
                >
                  <CircleX className={styles.skillRemoveIcon} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.skillsEmptyState}>
            No skills added yet. Use the field above to add skills manually or click <strong>AI Suggestions</strong>.
          </div>
        )}
      </div>

      {/* AI Suggestions Section Card */}
      {aiSuggestedSkills.length > 0 ? (
        <div ref={suggestedCardRef} className={`${styles.suggestedSectionCard} animate-fade-in`}>
          <div className={styles.suggestedSectionHeader}>
            <div className={styles.suggestedTitleContainer}>
              <Sparkles className={styles.suggestedIcon} size={16} />
              <span className={styles.suggestedSectionTitle}>AI Suggested Skills</span>
            </div>
          </div>
          <div className={styles.suggestedHint}>Tap to add to resume</div>
          
          <div className={styles.suggestedSkillsList}>
            {aiSuggestedSkills.map((skill) => (
              <div
                key={skill}
                className={styles.suggestedSkillTag}
                onClick={() => addSkillFromSuggestion(skill)}
                title="Tap to add to selected skills"
              >
                <Plus className={styles.suggestedTagAddIcon} />
                <span className={styles.suggestedTagName}>{skill}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSuggestedSkill(skill);
                  }}
                  className={styles.skillRemoveButton}
                  title="Dismiss suggestion"
                >
                  <CircleX className={styles.skillRemoveIcon} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !aiGenerating && jobTitle && (
          <div className={styles.suggestedPlaceholderCallout}>
            <Sparkles className={styles.suggestedPlaceholderIcon} size={20} />
            <p className={styles.suggestedPlaceholderText}>
              Need ideas? Click the <strong>AI Suggestions</strong> button above to find skills matching your job title of <em>"{jobTitle}"</em>.
            </p>
          </div>
        )
      )}
    </div>
  );
}
