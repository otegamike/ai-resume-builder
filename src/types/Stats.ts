export interface TimelineEntry {
  date: string;
  count: number;
}

export interface Timeline {
  visits: TimelineEntry[];
  signups: TimelineEntry[];
  resumes: TimelineEntry[];
  chartData?: { date: string; visits: number; signups: number; resumes: number }[];
}

export interface Stats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalResumes: number;
  resumesToday: number;
  resumesThisWeek: number;
  resumesThisMonth: number;
  visitsToday: number;
  visitsThisWeek: number;
  visitsThisMonth: number;
  activeUsers: number;
}

export interface AiUsageByFeature {
  feature: string;
  requests: number;
  tokens: number;
}

export interface AiUsageDaily {
  date: string;
  totalRequests: number;
  totalTokens: number;
  byFeature: { feature: string; requests: number }[];
}

export interface AiUsageStats {
  today: {
    totalRequests: number;
    totalTokens: number;
    truncatedCount: number;
    byFeature: AiUsageByFeature[];
  };
  daily: AiUsageDaily[];
}
