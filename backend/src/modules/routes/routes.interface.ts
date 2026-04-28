export interface RouteRequestDto {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export interface SafeRouteResponse {
  polyline: string;
  estimatedTimeMins: number;
  safetyScore: number;
  alertsOnRoute: string[];
}

export interface HelpCenter {
  id: string;
  name: string;
  type: 'police' | 'hospital' | 'shelter' | 'ngo';
  lat: number;
  lng: number;
  address: string;
  phone?: string;
}
