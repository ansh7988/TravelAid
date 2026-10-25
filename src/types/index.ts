export interface TrustedContact {
  id: string;
  name: string;
  relationship: string;
  phone: string; // digits with optional leading +
  isPrimary: boolean; // the first contact to be alerted; at most one
  createdAt: string;
  // Array order in storage is the contact priority (index 0 = highest).
}

export type TripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  departureAt: string; // ISO datetime
  expectedArrivalAt?: string;
  contactIds: string[];
  status: TripStatus;
  startedAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  fullName: string;
  phone: string;
  // Optional, explicitly consented sensitive fields. Kept empty unless the user opts in.
  medicalConsent: boolean;
  bloodGroup?: string;
  allergies?: string;
}

export interface Settings {
  shareLocationWithContacts: boolean; // default false
  notificationsEnabled: boolean;      // default false
}

export type EmergencyType = 'medical' | 'accident' | 'theft' | 'lost' | 'road' | 'other';

export type NearbyCategory =
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'police'
  | 'fuel'
  | 'parking'
  | 'repair'
  | 'hotel'
  | 'restaurant';