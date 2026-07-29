import { User, Mail, Bell, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import Subscription from "@/models/Subscription";
import CancelButton from "@/components/subscription/CancelButton";
import { hasActiveAccess } from "@/lib/subscription";
import { formatPlan } from "@/lib/creditCosts";
import styles from "./page.module.css";

export default async function DashboardSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <div className={styles.signInMessage}>Please sign in to view settings.</div>;
  }

  const authUser = await getAuthenticatedUser();
  const fullName = authUser?.user?.name || session.user.name || "";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");

  await dbConnect();
  const subscription = authUser
    ? await Subscription.findOne({ userId: authUser.userObjectId }).lean()
    : null;

  const active = hasActiveAccess(subscription);
  const statusLabel = active
    ? "Active"
    : subscription?.status === "non-renewing"
      ? "Expiring"
      : subscription?.status === "cancelled"
        ? "Cancelled"
        : "Inactive";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your account preferences and profile.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardHeaderTitle}>
            <div className={styles.cardHeaderTop}>
              <CreditCard className={styles.cardHeaderIcon} />
              Subscription
            </div>
          </h2>
          <p className={styles.cardHeaderDescription}>Manage your plan and billing.</p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Current Plan</label>
              <input
                value={formatPlan(subscription ? authUser?.user?.subscriptionPlan : "free")}
                className={styles.input}
                readOnly
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Status</label>
              <input
                value={statusLabel}
                className={styles.input}
                readOnly
                style={{
                  color: active ? "#2e7d32" : subscription?.status === "non-renewing" ? "#e65100" : "#999",
                  fontWeight: 600,
                }}
              />
            </div>
            {subscription?.currentPeriodEnd && (
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.label}>Current Period Ends</label>
                <input
                  value={new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  className={styles.input}
                  readOnly
                />
              </div>
            )}
            {(subscription?.status === "active" || subscription?.status === "non-renewing") && (
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <CancelButton disabled={subscription.status !== "active"} className={styles.cancelBtn} />
              </div>
            )}
          </div>
        </div>
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
