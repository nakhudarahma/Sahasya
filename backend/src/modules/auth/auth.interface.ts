export interface RegisterUserDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  emergencyContacts?: { name: string; phone: string }[];
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  fullName?: string;
  phone?: string;
  onboardingCompleted?: boolean;
  personalInfo?: any;
  locationSharing?: boolean;
  riskAlerts?: boolean;
  sosNotifications?: boolean;
  saveHistory?: boolean;
}

export interface EmergencyContactDto {
  id?: string;
  name: string;
  phone: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    initials: string;
    phone: string | null;
    onboardingCompleted: boolean;
    personalInfo: any;
    locationSharing: boolean;
    riskAlerts: boolean;
    sosNotifications: boolean;
    saveHistory: boolean;
    telegram_chat_id?: string | null;
    stats?: {
      reportsCount: number;
    };
  } | null;
  session: {
    access_token: string;
    refresh_token: string;
  } | null;
  emergencyContacts: EmergencyContactDto[];
}
