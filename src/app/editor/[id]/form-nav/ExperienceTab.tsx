import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Trash2 } from "lucide-react";
import styles from "../page.module.css";

interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ExperienceTabProps {
  experience: Experience[];
  addExperience: () => void;
  removeExperience: (id: string) => void;
  onChange: (id: string, field: string, value: string) => void;
}

export default function ExperienceTab({
  experience,
  addExperience,
  removeExperience,
  onChange,
}: ExperienceTabProps) {
  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>Work Experience</h2>
        <Button variant="outline" size="sm" onClick={addExperience} className={styles.addButton}>
          <Plus className={styles.addIcon} /> Add
        </Button>
      </div>

      <div className={styles.sectionCardsContainer}>
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
                <Input value={exp.company} onChange={(e) => onChange(exp.id, "company", e.target.value)} />
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabelSmall}>Job Role</label>
                <Input value={exp.role} onChange={(e) => onChange(exp.id, "role", e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>Start Date</label>
                <Input
                  value={exp.startDate}
                  onChange={(e) => onChange(exp.id, "startDate", e.target.value)}
                  placeholder="e.g. Jan 2020"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>End Date</label>
                <Input
                  value={exp.endDate}
                  onChange={(e) => onChange(exp.id, "endDate", e.target.value)}
                  placeholder="e.g. Present"
                />
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabelSmall}>Description</label>
                <textarea
                  className={styles.textarea}
                  value={exp.description}
                  onChange={(e) => onChange(exp.id, "description", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
