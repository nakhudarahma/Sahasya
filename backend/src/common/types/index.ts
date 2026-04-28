// Global shared types

export interface UserTokenPayload {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}
