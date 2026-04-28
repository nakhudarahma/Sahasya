// ── Incident DTOs (Evidence Vault) ──────────────────────────────────────────
// Matches the frontend's useIncidents hook data shape

export interface TimelineEntry {
  time: string;
  event: string;
}

export interface CreateIncidentDto {
  type: string;                     // 'SOS Triggered', 'ALERT Triggered', etc.
  location?: string;
  durationSeconds?: number;
  summary?: string;
  description?: string;             // Alternative to summary (used by ReportScreen)
  timeline?: TimelineEntry[];
}

export interface IncidentRecord {
  id: string;
  date: string;
  type: string;
  location: string;
  durationSeconds: number;
  summary: string;
  timeline: TimelineEntry[];
}

// ── Evidence Files ────────────────────────────────────────────────────────
export interface UploadEvidenceDto {
  incidentId: string;
  type: 'AUDIO' | 'VIDEO' | 'IMAGE';
  buffer: Buffer;
  mimetype: string;
}

export interface EvidenceFileRecord {
  id: string;
  userId: string;
  incidentId?: string;
  filePath: string;
  mediaUrl?: string;
  mediaType: string;
  fileSize?: number;
  lat?: number;
  lng?: number;
  status: string;
  createdAt: string;
}
