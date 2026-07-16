import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Sparkles, CircleX, Plus, AlertCircle, GripVertical, Trash2, Info, Zap } from "lucide-react";
import { maxSkillCount } from "@/constants/ResumeConstants";
import { CREDIT_COST } from "@/lib/creditCosts";
import styles from "../page.module.css";
import type { SkillCategory } from "@/types/ResumeData";

interface SkillsTabProps {
  skills: string[];
  skillCategories: SkillCategory[];
  skillCategorized: boolean;
  onCategorizeSkills: () => void;
  onUncategorizeSkills: () => void;
  updateSkillCategories: (cats: SkillCategory[]) => void;
  setSkills: (skills: string[]) => void;
  aiSuggestedSkills: string[];
  jobTitle: string;
  newSkill: string;
  setNewSkill: (val: string) => void;
  addSkill: () => void;
  removeSkill: (skill: string) => void;
  addSkillFromSuggestion: (skill: string) => void;
  removeSuggestedSkill: (skill: string) => void;
  generateAISkills: () => void;
  generateCategorizedSkills: () => void;
  aiGenerating: boolean;
  aiGeneratingFor: string | null;
  skillsError: string;
  setSkillsError: (val: string) => void;
}

export default function SkillsTab({
  skills,
  skillCategories,
  skillCategorized,
  onCategorizeSkills,
  onUncategorizeSkills,
  updateSkillCategories,
  setSkills,
  aiSuggestedSkills,
  jobTitle,
  newSkill,
  setNewSkill,
  addSkill,
  removeSkill,
  addSkillFromSuggestion,
  removeSuggestedSkill,
  generateAISkills,
  generateCategorizedSkills,
  aiGenerating,
  aiGeneratingFor,
  skillsError,
  setSkillsError,
}: SkillsTabProps) {
  const isLimitReached = skills.length >= maxSkillCount;
  const isNearLimit = skills.length >= maxSkillCount - 2;
  const percentage = Math.min(100, (skills.length / maxSkillCount) * 100);

  const suggestedCardRef = React.useRef<HTMLDivElement>(null);
  
  // Categorized mode check
  const isCategorizedMode = skillCategorized || (skillCategories && skillCategories.length > 0);

  React.useEffect(() => {
    if (aiSuggestedSkills.length > 0 && suggestedCardRef.current) {
      suggestedCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [aiSuggestedSkills]);

  const handleAddCategory = () => {
    updateSkillCategories([
      ...skillCategories,
      { id: Date.now().toString(), category: "New Category", skills: [] }
    ]);
  };

  const handleCategoryNameChange = (id: string, name: string) => {
    updateSkillCategories(
      skillCategories.map(cat => cat.id === id ? { ...cat, category: name } : cat)
    );
  };

  const handleRemoveCategory = (id: string) => {
    updateSkillCategories(skillCategories.filter(cat => cat.id !== id));
  };

  const handleRemoveSkillFromCategory = (catId: string, skillToRemove: string) => {
    updateSkillCategories(
      skillCategories.map(cat => cat.id === catId ? { ...cat, skills: cat.skills.filter(s => s !== skillToRemove) } : cat)
    );
  };

  const handleAddSkillToCategory = (catId: string, skillToAdd: string) => {
    if (!skillToAdd.trim()) return;
    updateSkillCategories(
      skillCategories.map(cat => cat.id === catId ? { ...cat, skills: [...cat.skills, skillToAdd.trim()] } : cat)
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, skill: string, sourceCatId: string) => {
    e.dataTransfer.setData("skill", skill);
    e.dataTransfer.setData("sourceCatId", sourceCatId);
  };

  const handleDrop = (e: React.DragEvent, targetCatId: string) => {
    e.preventDefault();
    const skill = e.dataTransfer.getData("skill");
    const sourceCatId = e.dataTransfer.getData("sourceCatId");

    if (skill && sourceCatId && sourceCatId !== targetCatId) {
      // Remove from source, add to target
      updateSkillCategories(
        skillCategories.map(cat => {
          if (cat.id === sourceCatId) {
            return { ...cat, skills: cat.skills.filter(s => s !== skill) };
          }
          if (cat.id === targetCatId) {
            return { ...cat, skills: [...cat.skills, skill] };
          }
          return cat;
        })
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className={styles.formSection}>
      {/* Header with AI Suggestions Trigger */}
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>Technical Skills</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="ai"
            size="sm"
            onClick={isCategorizedMode ? generateCategorizedSkills : generateAISkills}
            disabled={aiGenerating || !jobTitle}
            className={styles.aiButton}
            title={!jobTitle ? "Enter a job title first" : "Generate skills based on your job title"}
          >
            {aiGeneratingFor === "generateSkills" || aiGeneratingFor === "generateCategorizedSkills" ? (
              <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} />
            ) : (
              <Sparkles className={styles.aiButtonIcon} />
            )}
            {aiGeneratingFor === "generateSkills" || aiGeneratingFor === "generateCategorizedSkills" ? "Generating..." : (isCategorizedMode ? "Generate Categories" : "AI Suggestions")}
            <Zap size={12} />{CREDIT_COST.generateSkills}
          </Button>
        </div>
      </div>

      {/* Categorize Info Banner */}
      <div className={styles.categorizeBanner}>
        <div className={styles.categorizeBannerContent}>
          <div className={styles.categorizeBannerIcon}>
            <Info size={16} />
          </div>
          <div className={styles.categorizeBannerText}>
            <strong>Organize skills into categories</strong>
            <p>Group related skills into labeled sections to make your resume more structured. Each category appears as a separate section in the resume.</p>
            <Button
              size="sm"
              variant={isCategorizedMode ? "outline" : "primary"}
              onClick={isCategorizedMode ? onUncategorizeSkills : onCategorizeSkills}
              disabled={aiGenerating}
            >
              {aiGeneratingFor === "categorizeExistingSkills" && (
                <Loader2 className={`${styles.aiButtonIcon} ${styles.loadingIcon}`} />
              )}
              {aiGeneratingFor === "categorizeExistingSkills" ? "Categorizing..." : (isCategorizedMode ? "Uncategorize Skills" : "Categorize Skills")}
              {!isCategorizedMode && aiGeneratingFor !== "categorizeExistingSkills" && <><Zap size={12} />{CREDIT_COST.categorizeExistingSkills}</>}
            </Button>
          </div>
        </div>
        
      </div>

      {!isCategorizedMode ? (
        /* Selected Skills Section Card (Flat list) */
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
      ) : (
        /* Categorized Skills Section */
        <div className={styles.sectionCardsContainer}>
          {skillCategories.map((cat, index) => (
            <div 
              key={cat.id} 
              className={styles.sectionCard}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, cat.id)}
            >
              <div className={styles.sectionHeader}>
                <Input 
                  value={cat.category} 
                  onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)} 
                  className={styles.input} 
                  style={{ width: '200px', padding: '4px 8px' }}
                />
                <button
                  onClick={() => handleRemoveCategory(cat.id)}
                  className={`${styles.deleteButton} ${styles.deleteButton}`}
                >
                  <Trash2 className={styles.deleteIcon} />
                </button>
              </div>

              <div className={styles.skillsList} style={{ marginTop: '12px' }}>
                {cat.skills.map(skill => (
                   <div 
                     key={skill} 
                     className={styles.skillTag}
                     draggable
                     onDragStart={(e) => handleDragStart(e, skill, cat.id)}
                     style={{ cursor: 'grab' }}
                   >
                     <GripVertical size={14} style={{ marginRight: '4px', opacity: 0.5 }} />
                     {skill}
                     <button 
                       onClick={() => handleRemoveSkillFromCategory(cat.id, skill)} 
                       className={styles.skillRemoveButton}
                       title="Remove skill"
                     >
                       <CircleX className={styles.skillRemoveIcon} />
                     </button>
                   </div>
                ))}
              </div>

              <div className={styles.skillsContainer} style={{ marginTop: '12px' }}>
                <Input
                  id={`cat-input-${cat.id}`}
                  placeholder="Add skill to category..."
                  className={`${styles.input} ${styles.skillsInput}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                       handleAddSkillToCategory(cat.id, e.currentTarget.value);
                       e.currentTarget.value = "";
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    const input = document.getElementById(`cat-input-${cat.id}`) as HTMLInputElement;
                    if (input) {
                      handleAddSkillToCategory(cat.id, input.value);
                      input.value = "";
                    }
                  }} 
                  className={styles.skillsAddButton} 
                >
                  Add
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={handleAddCategory} className={`${styles.addButton} ${styles.addButtonFull}`}>
            <Plus className={styles.addIcon} /> Add Category
          </Button>
        </div>
      )}

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
                onClick={() => {
                  if (isCategorizedMode && skillCategories.length > 0) {
                     handleAddSkillToCategory(skillCategories[0].id, skill);
                     removeSuggestedSkill(skill);
                  } else {
                     addSkillFromSuggestion(skill);
                  }
                }}
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
        !aiGenerating && jobTitle && !isCategorizedMode && (
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
