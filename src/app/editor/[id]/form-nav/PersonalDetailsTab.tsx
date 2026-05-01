import React from "react";
import { Input } from "@/components/ui/Input";
import styles from "../page.module.css";

interface PersonalInfo {
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
}

interface PersonalDetailsTabProps {
  personalInfo: PersonalInfo;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PersonalDetailsTab({ personalInfo, onChange }: PersonalDetailsTabProps) {
  return (
    <div className={styles.formSection}>
      <h2 className={styles.formSectionTitle}>Personal Details</h2>
      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
          <label className={styles.formLabel}>Full Name</label>
          <Input name="name" value={personalInfo.name} onChange={onChange} />
        </div>
        <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
          <label className={styles.formLabel}>Job Title</label>
          <Input name="jobTitle" value={personalInfo.jobTitle} onChange={onChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Email</label>
          <Input name="email" value={personalInfo.email} onChange={onChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Phone</label>
          <Input name="phone" value={personalInfo.phone} onChange={onChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Location</label>
          <Input name="location" value={personalInfo.location} onChange={onChange} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Website / Link</label>
          <Input name="website" value={personalInfo.website} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
