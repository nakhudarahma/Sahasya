export interface ReportHotspotDto {
  label: string;
  type: 'danger' | 'caution' | 'safe';
  lat: number;
  lng: number;
  radius?: number;
  description?: string;
}

export interface Hotspot {
  id: string;
  label: string;
  type: 'danger' | 'caution' | 'safe';
  lat: number;
  lng: number;
  radius: number;
  description: string;
  upvotes: number;
  verified: boolean;
}
