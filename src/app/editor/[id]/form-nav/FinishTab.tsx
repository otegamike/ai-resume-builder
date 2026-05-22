
import styles from "../page.module.css";
import { FileCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tab } from "../page";

interface FinishTabProps {
   changeTab: (newTab: Tab | "next" | "prev") => void
}

export default function FinishTab({
  changeTab
}: FinishTabProps) {
  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <Button variant="outline" size="sm" className={styles.previousButton} onClick={() => changeTab("prev")}>
          <ArrowLeft className={styles.tabNavigationIcon} />
          Back
        </Button>
      </div>
      <div className={styles.formSectionContent}>
        <div className={styles.finishContainer}>
          <FileCheck size={90} color="var(--ring)" />
          <p>Your ATS-optimized Resume is ready</p>
          <small>preview or export below</small>
        </div>
      </div>
    </div>
  );
}
