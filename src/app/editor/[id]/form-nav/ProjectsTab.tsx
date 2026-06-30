import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Trash2, X } from "lucide-react";
import styles from "../page.module.css";
import type { Project } from "@/types/ResumeData";
import { useState } from "react";

interface ProjectsTabProps {
  projects: Project[];
  addProject: () => void;
  removeProject: (id: string) => void;
  onChange: (id: string, field: string, value: string | string[]) => void;
}

export default function ProjectsTab({
  projects,
  addProject,
  removeProject,
  onChange,
}: ProjectsTabProps) {
  // Track bullet point input per project by id
  const [bulletInputs, setBulletInputs] = useState<Record<string, string>>({});

  const getBulletInput = (id: string) => bulletInputs[id] || "";

  const setBulletInput = (id: string, value: string) => {
    setBulletInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddBullet = (proj: Project) => {
    const input = getBulletInput(proj.id);
    if (input.trim()) {
      const newDescription = [...(proj.description || []), input.trim()];
      onChange(proj.id, "description", newDescription);
      setBulletInput(proj.id, "");
    }
  };

  const handleRemoveBullet = (proj: Project, bulletIndex: number) => {
    const newDescription = proj.description.filter((_, i) => i !== bulletIndex);
    onChange(proj.id, "description", newDescription);
  };

  const handleKeyDown = (e: React.KeyboardEvent, proj: Project) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddBullet(proj);
    }
  };

  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <h2 className={styles.formSectionTitle}>Projects</h2>
        <Button variant="outline" size="sm" onClick={addProject} className={styles.addButton}>
          <Plus className={styles.addIcon} /> Add
        </Button>
      </div>

      <div className={styles.sectionCardsContainer} >
        {projects.map((proj, index) => (
          <div key={proj.id} className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span>Project #{index + 1}</span>
              <button
                onClick={() => removeProject(proj.id)}
                className={`${styles.deleteButton} ${styles.deleteButton}`}
              >
                <Trash2 className={styles.deleteIcon} />
              </button>
            </div>
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabelSmall}>Project Name</label>
                <Input value={proj.name} className={styles.input} onChange={(e) => onChange(proj.id, "name", e.target.value)} />
              </div>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <div className={styles.descriptionHeader}>
                  <label className={styles.formLabelSmall}>Description</label>
                </div>
                <div className={styles.experienceBulletContainer} >
                  
                  {proj.description && proj.description.length > 0 && (
                    <ul>
                      {proj.description.map((line, i) => (
                        <li key={i}>
                          <span>{line}</span>
                          <button
                            className={styles.bulletRemoveButton}
                            onClick={() => handleRemoveBullet(proj, i)}
                            title="Remove bullet point"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) }

                  <textarea
                    placeholder={`Describe your project${proj.name ? ` ${proj.name}` : ""}... (press enter to add)`}
                    className={`${styles.experienceInput} ${styles.textarea}`}
                    value={getBulletInput(proj.id)}
                    onChange={(e) => setBulletInput(proj.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, proj)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addProject} className={`${styles.addButton} ${styles.addButtonFull}`}>
          <Plus className={styles.addIcon} /> Add Project
        </Button>
      </div>
     </div>
  );
}
