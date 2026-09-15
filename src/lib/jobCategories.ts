export const JOB_CATEGORIES = [
  "Administration",
  "Construction",
  "Customer Support",
  "Data & Analytics",
  "Design",
  "Education",
  "Engineering",
  "Finance",
  "Healthcare",
  "Hospitality",
  "HR",
  "IT",
  "Legal",
  "Manufacturing",
  "Marketing",
  "Operations",
  "Product",
  "Retail",
  "Sales",
  "Transportation",
  "Other",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const JOB_CATEGORIES_WITH_ALL = ["All", ...JOB_CATEGORIES] as const;

export const DEFAULT_JOB_CATEGORY: JobCategory = "Other";
