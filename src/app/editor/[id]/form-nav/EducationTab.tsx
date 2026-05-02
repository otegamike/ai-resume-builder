import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Trash2 } from "lucide-react";
import styles from "../page.module.css";

interface Education {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
}

interface EducationTabProps {
  education: Education[];
  addEducation: () => void;
  removeEducation: (id: string) => void;
  onChange: (id: string, field: string, value: string) => void;
}

export default function EducationTab({
  education,
  addEducation,
  removeEducation,
  onChange,
}: EducationTabProps) {
  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>Education</h2>
        <Button variant="outline" size="sm" onClick={addEducation} className={styles.addButton}>
          <Plus className={styles.addIcon} /> Add
        </Button>
      </div>

      <div className={styles.sectionCardsContainer} >
        {education.map((edu, index) => (
          <div key={edu.id} className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span>School/University #{index + 1}</span>
              <button onClick={() => removeEducation(edu.id)} className={styles.deleteButton}>
                <Trash2 className={styles.deleteIcon} />
              </button>
            </div>
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabelSmall}>Institution Name</label>
                <Input className={styles.input} value={edu.school} onChange={(e) => onChange(edu.id, "school", e.target.value)} />
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabelSmall}>Degree/Field of Study</label>
                <Input className={styles.input} value={edu.degree} onChange={(e) => onChange(edu.id, "degree", e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>Start Year</label>
                <Input className={styles.input} value={edu.startDate} onChange={(e) => onChange(edu.id, "startDate", e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabelSmall}>End Year</label>
                <Input className={styles.input} value={edu.endDate} onChange={(e) => onChange(edu.id, "endDate", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
