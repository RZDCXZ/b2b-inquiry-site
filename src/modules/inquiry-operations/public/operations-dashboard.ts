import type { InquiryStatus } from "@/src/modules/inquiry-operations/public/inquiry-lifecycle";

export type InquiryStatusCounts = Record<InquiryStatus, number>;

export type InquiryDashboardTask = {
  company: string;
  nextStepDate: Date | null;
  referenceNumber: string;
  sourcePage: string;
  status: InquiryStatus;
};

export type DueFollowUps = {
  dueToday: number;
  overdue: number;
  total: number;
};

export type AdministratorInquiryDashboard = {
  closeResults: { invalid: number; lost: number; won: number };
  dueFollowUps: DueFollowUps;
  quotedCount: number;
  sourceCounts: Array<{ count: number; source: string }>;
  statusCounts: InquiryStatusCounts;
  tasks: InquiryDashboardTask[];
  unassignedCount: number;
};

export type SalesInquiryDashboard = {
  dueFollowUps: DueFollowUps;
  statusCounts: InquiryStatusCounts;
  tasks: InquiryDashboardTask[];
  totalCount: number;
};
