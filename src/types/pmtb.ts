export type UserRole = 'admin' | 'leader' | 'user';
export type DutyPosition = 'Platoon Leader' | 'Platoon Sergeant' | 'RTO' | 'Medic' | 'Rifleman' | 'Driver' | 'Gunner';
export type LocationStatus = 'home' | 'on_duty' | 'off_duty' | 'active_mission' | 'leave' | 'tdy';

export type ReadinessStatus = 'ready' | 'warning' | 'critical';

export interface Personnel {
  id: string;
  serviceNumber: string;
  rank: string;
  firstName: string;
  lastName: string;
  dutyPosition: DutyPosition;
  battalionId?: string;
  companyId?: string;
  platoonId?: string;
  role: UserRole;
  phone: string;
  email: string;
  localAddress: string;
  locationStatus: LocationStatus;
  skills: string[];
  driverLicenses: string[];
  profileImage?: string;
  readinessStatus: ReadinessStatus;
  isSignatureApproved?: boolean;
}

export interface Equipment {
  id: string;
  serialNumber?: string;
  name: string;
  description?: string;
  quantity: number;
  assignedTo?: string;
  assignedType?: 'individual' | 'company' | 'platoon' | 'battalion';
  createdBy?: string;
}

export interface TransferHistoryRecord {
  id: string;
  equipmentId: string;
  quantity: number;
  fromUnitType: string;
  fromName?: string;
  toUnitType: string;
  toName?: string;
  transferredBy?: string;
  transferredByName?: string;
  transferredAt: string;
  notes?: string;
}

export interface DailyReport {
  id: string;
  date: string;
  team: string;
  submittedBy: string;
  personnelStatuses: {
    personnelId: string;
    status: LocationStatus;
    notes?: string;
  }[];
}

export interface PlatoonStats {
  totalPersonnel: number;
  readyPersonnel: number;
  onMission: number;
  onLeave: number;
  equipmentServiceable: number;
  equipmentTotal: number;
  certificationsDue: number;
}
