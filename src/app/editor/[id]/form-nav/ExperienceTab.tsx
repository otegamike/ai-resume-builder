import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Trash2, Sparkles, Loader2, X } from "lucide-react";
import styles from "../page.module.css";
import type { Experience } from "@/types/ResumeData";
import { useState } from "react";

interface ExperienceTabProps {
  experience: Experience[];
  addExperience: () => void;
  removeExperience: (id: string) => void;
  generateBulletPoints: (index: number) => Promise<void>;
  aiGeneratingFor: string | null;
  onChange: (id: string, field: string, value: string | string[]) => void;
}

export default function ExperienceTab({
  experience,
  addExperience,
  removeExperience,
  onChange,
  generateBulletPoints,
  aiGeneratingFor,
}: ExperienceTabProps) {
  // Track bullet point input per experience card by id
  const [bulletInputs, setBulletInputs] = useState<Record<string, string>>({});

  const getBulletInput = (id: string) => bulletInputs[id] || "";

  const setBulletInput = (id: string, value: string) => {
    setBulletInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddBullet = (exp: Experience) => {
    const input = getBulletInput(exp.id);
    if (input.trim()) {
      const newDescription = [...(exp.description || []), input.trim()];
      onChange(exp.id, "description", newDescription);
      setBulletInput(exp.id, "");
    }
  };

  const handleRemoveBullet = (exp: Experience, bulletIndex: number) => {
    const newDescription = exp.description.filter((_, i) => i !== bulletIndex);
    onChange(exp.id, "description", newDescription);
  };

  const handleKeyDown = (e: React.KeyboardEvent, exp: Experience) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddBullet(exp);
    }
  };

  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>Work Experience</h2>
        <Button variant="outline" size="sm" onClick={addExperience} className={styles.addButton}>
          <Plus className={styles.addIcon} /> Add
        </Button>
      </div>

      <div className={styles.sectionCardsContainer} >
        {experience.map((exp, index) => (
          <div key={exp.id} className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span>Experience #{index + 1}</span>
              <button
                onClick={() => removeExperience(exp.id)}
                className={`${styles.deleteButton} ${styles.deleteButton}`}
              >
                <Trash2 className={styles.deleteIcon} />
              </button>
            </div>
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabelSmall}>Company Name</label>
                <Input value={exp.company} className={styles.input} onChange={(e) => onChange(exp.id, "company", e.target.value)} />
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={`${styles.formLabelSmall} ${styles.input}`}>Job Role</label>
                <Input value={exp.role} className={styles.input} onChange={(e) => onChange(exp.id, "role", e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>Start Date</label>
                <Input
                  value={exp.startDate}
                  className={styles.input}
                  onChange={(e) => onChange(exp.id, "startDate", e.target.value)}
                  placeholder="e.g. Jan 2020"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>End Date</label>
                <Input
                  value={exp.endDate}
                  className={styles.input}
                  onChange={(e) => onChange(exp.id, "endDate", e.target.value)}
                  placeholder="e.g. Present"
                />
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <div className={styles.descriptionHeader}>
                  <label className={styles.formLabelSmall}>Description</label>
                  
                  {exp.description?.length > 0 && (
                    <Button variant="ai" size="sm" onClick={() => generateBulletPoints(index)} disabled={aiGeneratingFor === `generateBulletPoints_${index}`}>
                      {aiGeneratingFor === `generateBulletPoints_${index}` ? (
                          <>
                            <Loader2 size={16} className={styles.spinner} /> Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} /> Improve with AI
                          </>
                        )}
                    </Button>
                  )}

                </div>
                <div className={styles.experienceBulletContainer} >
                  
                  {exp.description && exp.description.length > 0 && (
                    <ul>
                      {exp.description.map((line, i) => (
                        <li key={i}>
                          <span>{line}</span>
                          <button
                            className={styles.bulletRemoveButton}
                            onClick={() => handleRemoveBullet(exp, i)}
                            title="Remove bullet point"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) }

                  <textarea
                    placeholder={`List your roles and responsiblities${exp.company ? ` at ${exp.company}` : ""}... (max 3)`}
                    className={`${styles.experienceInput} ${styles.textarea}`}
                    value={getBulletInput(exp.id)}
                    onChange={(e) => setBulletInput(exp.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, exp)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addExperience} className={`${styles.addButton} ${styles.addButtonFull}`}>
          <Plus className={styles.addIcon} /> Add Experience
        </Button>
      </div>
     </div>
  );
}
