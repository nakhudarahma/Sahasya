import { GeoLocation } from '../../common/types';

export interface TriggerPanicDto {
  location?: {
    latitude: number;
    longitude: number;
  };
  locationLabel?: string;            // e.g. 'Andheri West, Mumbai'
  type?: 'PANIC' | 'MEDICAL' | 'HARASSMENT';
  skipNotifications?: boolean;       // If true, logs incident but skips sending alerts
}

export interface StartTrackingDto {
  destination?: string;
}

export interface PanicResponse {
  incidentId: string;
  trackId?: string;
  status: string;
  contactsNotified: number;
  trackingUrl?: string;
}

export interface TrackingResponse {
  trackId: string;
  shareLink: string;
  isActive: boolean;
}
