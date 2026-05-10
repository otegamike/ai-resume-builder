import { User, Mail, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/authUser";
import styles from "./page.module.css";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <div className={styles.signInMessage}>Please sign in to view settings.</div>;
  }

  const authUser = await getAuthenticatedUser();
  const fullName = authUser?.user?.name || session.user.name || "";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your account preferences and profile.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardHeaderTitle}>
            <div className={styles.cardHeaderTop}>
              <User className={styles.cardHeaderIcon} />
              Profile Information
            </div>
          </h2>
          <p className={styles.cardHeaderDescription}>Update your account details here.</p>
        </div>
        
        <div className={styles.cardContent}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>First Name</label>
              <input value={firstName || ''} className={styles.input} readOnly />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Last Name</label>
              <input value={lastName || ''} className={styles.input} readOnly />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>
                <div className={styles.labelWithIcon}>
                  <Mail className={styles.labelIcon} />
                  Email Address
                </div>
              </label>
              <input value={session.user.email || ''} className={styles.input} readOnly />
              <p className={styles.inputHelper}>Authentication will be required to change your email.</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.noticeContent}>
            <div>
              <h2 className={styles.cardHeaderTitle}>
                <div className={styles.cardHeaderTop}>
                  <Bell className={styles.cardHeaderIcon} />
                  Notifications
                </div>
              </h2>
              <p className={styles.cardHeaderDescription}>Manage how we communicate with you.</p>
            </div>
            <Button disabled className={styles.noticeButton}>Save Preferences</Button>
          </div>
        </div>
      </div>
    </div>
  );
}