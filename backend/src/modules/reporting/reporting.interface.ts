export interface CreateReportDto {
  type: string;
  category?: string;
  description: string;
  location?: string;
  isAnonymous?: boolean;
  anonymous?: boolean;     // Alias used by frontend to avoid mismatch
  escalation?: string;
  evidenceId?: string;
  timeline?: { time: string; event: string }[];
}

export interface ReportRecord {
  id: string;
  type: string;
  category?: string;
  description: string;
  location: string;
  isAnonymous: boolean;
  escalation: string;
  evidenceId?: string;
  status: string;                   // 'PENDING' | 'INVESTIGATING' | 'RESOLVED'
  date: string;
}
