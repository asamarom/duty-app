import { Timestamp } from 'firebase/firestore';

// Enums (matching the original PostgreSQL enums)
export type AppRole = 'admin' | 'leader' | 'user';
export type UnitType = 'battalion' | 'company' | 'platoon';
export type UnitStatus = 'active' | 'inactive' | 'deployed';
export type EquipmentStatus = 'serviceable' | 'unserviceable' | 'in_maintenance' | 'missing' | 'pending_transfer';
export type LocationStatus = 'home' | 'on_duty' | 'off_duty' | 'active_mission' | 'leave' | 'tdy';
export type ReadinessStatus = 'ready' | 'warning' | 'critical';
export type AssignmentRequestStatus = 'pending' | 'approved' | 'rejected';
export type SignupRequestStatus = 'pending' | 'approved' | 'declined';

// Firestore document interfaces

export interface UserDoc {
  fullName: string | null;
  avatarUrl: string | null;
  unitId: string | null;
  roles: AppRole[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UnitDoc {
  name: string;
  unitType: UnitType;
  parentId: string | null;
  designation: string | null;
  leaderId: string | null;
  status: UnitStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PersonnelDoc {
  userId: string | null;
  unitId: string | null;
  serviceNumber: string;
  rank: string;
  firstName: string;
  lastName: string;
  dutyPosition: string | null;
  phone: string | null;
  email: string | null;
  localAddress: string | null;
  profileImage: string | null;
  locationStatus: LocationStatus;
  readinessStatus: ReadinessStatus;
  skills: string[];
  driverLicenses: string[];
  isSignatureApproved: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EquipmentDoc {
  name: string;
  serialNumber: string | null;
  description: string | null;
  category: string | null;
  quantity: number;
  status: EquipmentStatus;
  createdBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EquipmentAssignmentDoc {
  equipmentId: string;
  personnelId: string | null;
  unitId: string | null;
  quantity: number;
  assignedBy: string | null;
  assignedAt: Timestamp;
  returnedAt: Timestamp | null;
  notes: string | null;
  createdAt: Timestamp;
}

export interface AssignmentRequestDoc {
  equipmentId: string;
  fromUnitType: string;
  fromUnitId: string | null;
  fromPersonnelId: string | null;
  toUnitType: string;
  toUnitId: string | null;
  toPersonnelId: string | null;
  status: AssignmentRequestStatus;
  requestedBy: string | null;
  requestedAt: Timestamp;
  notes: string | null;
  recipientApproved: boolean;
  recipientApprovedAt: Timestamp | null;
  recipientApprovedBy: string | null;
  quantity?: number;
  // Denormalized display names
  equipmentName?: string;
  fromName?: string;
  toName?: string;
  requestedByName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SignupRequestDoc {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  serviceNumber: string;
  requestedUnitId: string | null;
  status: SignupRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  declineReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminUnitAssignmentDoc {
  userId: string;
  unitId: string | null;
  unitType: string;
  createdAt: Timestamp;
}

// Constants (matching the original)
export const Constants = {
  public: {
    Enums: {
      app_role: ['admin', 'leader', 'user'],
      assignment_request_status: ['pending', 'approved', 'rejected'],
      equipment_status: ['serviceable', 'unserviceable', 'in_maintenance', 'missing', 'pending_transfer'],
      location_status: ['home', 'on_duty', 'off_duty', 'active_mission', 'leave', 'tdy'],
      readiness_status: ['ready', 'warning', 'critical'],
      signup_request_status: ['pending', 'approved', 'declined'],
      unit_status: ['active', 'inactive', 'deployed'],
      unit_type: ['battalion', 'company', 'platoon'],
    },
  },
} as const;

// Row types (for compatibility with existing code that uses Tables<"tableName"> pattern)
export interface Unit {
  id: string;
  name: string;
  unit_type: UnitType;
  parent_id: string | null;
  designation: string | null;
  leader_id: string | null;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
}

export type UnitInsert = Omit<Unit, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type UnitUpdate = Partial<Omit<Unit, 'id'>>;
