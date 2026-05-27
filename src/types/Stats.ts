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
