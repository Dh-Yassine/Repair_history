export type UserRole = 'OWNER' | 'SHOP' | 'ADMIN' | 'BUYER';
export type VisibilityType = 'PUBLIC' | 'PRIVATE' | 'PARTNER_ONLY';
export type ShareLevel = 'FULL' | 'SUMMARY' | 'NONE';
export type EventSource = 'OWNER' | 'SHOP';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  maxVehicles?: number;
  subscriptionType?: string;
  shopName?: string | null;
  address?: string | null;
  shopVerified?: boolean;
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  createdAt: string;
}

export interface VehicleLimits {
  count: number;
  max: number;
  canAdd: boolean;
  subscriptionType: string;
}

export interface Badge {
  id: string;
  vehicleId: string;
  embedCode: string;
  isAnimated: boolean;
  createdAt: string;
}

export interface ShareSettings {
  visibility: VisibilityType;
  shareLevel: ShareLevel;
  shareToken: string | null;
  shareUrl: string | null;
  badge: Badge | null;
  embedCode: string | null;
  vehicle?: { make: string; model: string; year: number };
  stats?: {
    totalEvents: number;
    verifiedCount: number;
    shopVerifiedCount: number;
    selfReportedCount: number;
    trustScore: number;
  };
}

export interface Vehicle {
  id: string;
  ownerId: string;
  vin: string | null;
  serialNumber?: string | null;
  nickname?: string | null;
  make: string;
  model: string;
  year: number;
  mileage: number;
  photoPath?: string | null;
  photoUrl?: string | null;
  visibility: VisibilityType;
  shareLevel?: ShareLevel;
  shareToken?: string | null;
  shareEverEnabled?: boolean;
  status?: 'ACTIVE' | 'ARCHIVED';
  archivedAt?: string | null;
  createdAt: string;
  _count?: { events: number };
}

export interface Verification {
  id: string;
  eventId: string;
  shopId: string;
  verifiedAt: string;
  status: string;
  proofPath: string | null;
  notes: string | null;
  shop?: Pick<User, 'id' | 'shopName' | 'fullName'>;
}

export interface OCRResult {
  id: string;
  documentId: string;
  extractedText: string;
  confidenceScore: number;
  parsedDate: string | null;
  parsedAmount: number | null;
  parsedVendor: string | null;
}

export interface Document {
  id: string;
  eventId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  uploadDate: string;
  ocrResult?: OCRResult | null;
}

export interface ServiceReminder {
  id: string;
  vehicleId: string;
  serviceType: string;
  dueMileage: number | null;
  dueDate: string | null;
  message: string | null;
  sourceEventId?: string | null;
  sourceDate?: string | null;
  sourceMileage?: number | null;
  completed: boolean;
  vehicle?: { make: string; model: string; year: number };
  shop?: { shopName: string | null };
}

export interface MaintenanceSuggestion {
  serviceType: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedDueDate?: string;
  suggestedDueMileage?: number;
}

export interface OwnerAnalytics {
  averageServiceCost: number;
  serviceFrequency: number;
  conversionRate: number;
  /** Weighted (event type × recency) verified share, 0–100 */
  trustScore?: number;
  verifiedCount: number;
  selfReportedCount?: number;
  shopVerifiedCount?: number;
  totalEvents: number;
  vehicleCount: number;
  eventsByType: Record<string, number>;
  costByMonth: Record<string, number>;
  upcomingNeeds: Array<{
    vehicleId: string;
    vehicleLabel: string;
    serviceType: string;
    dueDate: string;
    dueMileage: number;
  }>;
  recentEvents: Array<{
    eventType: string;
    date: string;
    cost: number | null;
    verified: boolean;
    source?: EventSource;
    vehicleLabel: string;
  }>;
}

export interface ShopAnalytics {
  totalVerifications: number;
  verificationsLast30Days: number;
  pendingEvents: number;
  serviceFrequency: number;
  conversionRate: number;
  recentVerifications: Array<{
    eventType: string;
    verifiedAt: string;
    vehicle: string;
  }>;
}

export interface MaintenanceEvent {
  id: string;
  vehicleId: string;
  source?: EventSource;
  createdByShopId?: string | null;
  eventType: string;
  date: string;
  mileage: number;
  cost?: number | null;
  garageName: string | null;
  notes: string | null;
  verified: boolean;
  flagged?: boolean;
  createdAt: string;
  updatedAt: string;
  documents: Document[];
  verification?: Verification | null;
  createdByShop?: Pick<User, 'id' | 'shopName' | 'fullName'> | null;
  documentCount?: number;
  vehicle?: Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'vin' | 'mileage'> & {
    owner?: { email: string };
  };
}

export interface ShopVehicleLookup {
  owner: Pick<User, 'id' | 'fullName' | 'email'>;
  vehicles: Vehicle[];
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface VinDecode {
  vin: string;
  make: string;
  model: string;
  year: number | null;
}

export interface PublicVehicle {
  make: string;
  model: string;
  year: number;
  mileage: number;
  vin: string | null;
  serialNumber?: string | null;
  visibility: VisibilityType;
  shareLevel: ShareLevel;
  verifiedCount: number;
  totalEvents: number;
}

export interface PublicShareMeta {
  visibility: VisibilityType;
  shareLevel: ShareLevel;
  accessLabel: string;
  detailLabel: string;
  showVin: boolean;
  showGarageDetails: boolean;
  showNotes: boolean;
  showCosts: boolean;
  showShopAttribution: boolean;
  showProofCounts: boolean;
  description: string;
  accessDescription: string;
}

export interface PublicHistory {
  vehicle: PublicVehicle;
  events: MaintenanceEvent[];
  trustScore?: number;
  share?: PublicShareMeta;
  badge?: { isAnimated: boolean; trustScore: number } | null;
}

export interface SparePart {
  id: string;
  partName: string;
  price: number;
  supplier: string;
  buyUrl: string;
  category: string;
  make?: string | null;
  model?: string | null;
  fitsVehicle?: boolean;
}

export interface FeaturedShopAd {
  id: string;
  ctaButton: string;
  startDate: string;
  endDate: string;
  priority: number;
  shop: {
    id: string;
    shopName: string | null;
    address: string | null;
    shopVerified: boolean;
  };
}

export interface AdminStats {
  users: number;
  shops: number;
  vehicles: number;
  events: number;
  flaggedEvents: number;
  pendingReports: number;
  pendingShops?: number;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  banned: boolean;
  shopName?: string | null;
  shopVerified?: boolean;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  _count?: { vehicles: number };
}

export interface ModerationReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface BadgeAnalytics {
  period: string;
  totalEvents: number;
  byType: Record<string, number>;
  uniqueBadges: number;
  conversionRate: number;
  topBadges: Array<{ token: string; count: number }>;
}

export interface SiteVisitStats {
  range: string;
  since: string;
  totalVisits: number;
  uniqueVisitors: number;
  signedInVisitors: number;
  topPaths: Array<{ path: string; count: number }>;
  timeline: Array<{ date: string; count: number }>;
  recent: Array<{
    path: string;
    sessionId: string;
    createdAt: string;
    referrer: string | null;
    signedIn: boolean;
  }>;
}

export interface InsuranceInsights {
  fleetSize: number;
  platformVerificationRate: number;
  byManufacturer: Array<{ make: string; vehicles: number; avgEvents: number; verificationRate: number }>;
  byServiceType: Array<{ type: string; count: number }>;
  disclaimer: string;
}
