// Shared types for the 12-step onboarding wizard flow

export type BusinessType = "bungalow" | "tiny_house" | "villa" | "hotel" | "pension" | "apartment";
export type Currency = "TRY" | "EUR" | "USD";

// Step 1: İşletme Bilgileri
export interface BusinessInfoData {
  businessName: string;
  businessType: BusinessType;
  address: string;
  city: string;
  phone: string;
  whatsappNumber: string;
  email: string;
}

// Step 2: Konum ve Ulaşım
export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  directions: string;
  parkingInfo: string;
  parkingAvailable: boolean;
}

// Step 3: Birim Tipleri
export interface UnitData {
  id: string;
  name: string;
  description: string;
  capacity: number;
  count: number; // number of this type
  basePrice: number;
  weekendPrice: number;
  amenities: string[];
}

// Step 4: Fiyatlandırma
export interface PricingData {
  currency: Currency;
  seasonalAdjustments: SeasonalAdjustment[];
  minimumStayNights: number;
}

export interface SeasonalAdjustment {
  id: string;
  name: string;
  startDate: string; // MM-DD
  endDate: string; // MM-DD
  multiplier: number; // e.g. 1.2 = +20%
}

// Step 5: Özel Özellikler (shared amenities across property)
export interface AmenitiesData {
  jacuzzi: boolean;
  pool: boolean;
  bbq: boolean;
  kitchen: boolean;
  wifi: boolean;
  ac: boolean;
  parking: boolean;
  garden: boolean;
  tv: boolean;
  fireplace: boolean;
  washingMachine: boolean;
  petFriendly: boolean;
}

// Step 6: Kurallar
export interface RulesData {
  checkInTime: string;
  checkOutTime: string;
  petPolicy: "allowed" | "not_allowed" | "on_request";
  petDetails: string;
  smokingPolicy: "allowed" | "not_allowed" | "outdoor_only";
  smokingDetails: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  additionalRules: string;
}

// Step 7: İptal Politikası
export interface CancellationData {
  policyType: "flexible" | "moderate" | "strict" | "custom";
  freeCancellationDays: number;
  refundPercentages: RefundRule[];
  customPolicy: string;
}

export interface RefundRule {
  daysBefore: number;
  refundPercentage: number;
}

// Step 8: Depozito ve Ödeme
export interface DepositPaymentData {
  depositPercentage: number;
  depositType: "percentage" | "fixed";
  depositFixedAmount: number;
  iban: string;
  bankName: string;
  accountHolder: string;
  paymentMethods: string[];
}

// Step 9: Çevre Bilgileri
export interface SurroundingsData {
  nearbyMarkets: string;
  nearbyRestaurants: string;
  nearbyAttractions: string;
  nearbyTransport: string;
  distanceToBeach: string;
  distanceToAirport: string;
  distanceToCenter: string;
}

// Step 10: Acil Durum
export interface EmergencyData {
  emergencyContactName: string;
  emergencyContactPhone: string;
  nearestHospital: string;
  nearestHospitalPhone: string;
  nearestPolice: string;
  nearestPolicePhone: string;
  fireDepartment: string;
  additionalContacts: string;
}

// Step 11: Kişisel Karşılama
export interface GreetingData {
  greetingMessage: string;
  personaName: string;
  personaTone: "formal" | "friendly" | "warm";
  welcomeNote: string;
  autoReplyEnabled: boolean;
}

// Combined onboarding data
export interface OnboardingData {
  business: BusinessInfoData;
  location: LocationData;
  units: UnitData[];
  pricing: PricingData;
  amenities: AmenitiesData;
  rules: RulesData;
  cancellation: CancellationData;
  depositPayment: DepositPaymentData;
  surroundings: SurroundingsData;
  emergency: EmergencyData;
  greeting: GreetingData;
}

// Step completion tracking
export interface OnboardingStepStatus {
  stepNumber: number;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

export const AMENITIES_LIST = [
  { id: "wifi", label: "WiFi" },
  { id: "ac", label: "Klima" },
  { id: "tv", label: "TV" },
  { id: "kitchen", label: "Mutfak" },
  { id: "parking", label: "Otopark" },
  { id: "pool", label: "Havuz" },
  { id: "bbq", label: "Mangal" },
  { id: "garden", label: "Bahçe" },
  { id: "sea-view", label: "Deniz Manzarası" },
  { id: "forest-view", label: "Orman Manzarası" },
  { id: "fireplace", label: "Şömine" },
  { id: "jacuzzi", label: "Jakuzi" },
  { id: "washing-machine", label: "Çamaşır Makinesi" },
  { id: "iron", label: "Ütü" },
  { id: "hair-dryer", label: "Saç Kurutma" },
  { id: "safe-box", label: "Kasa" },
  { id: "pet-friendly", label: "Evcil Hayvan" },
  { id: "baby-cot", label: "Bebek Yatağı" },
] as const;

export const STEP_LABELS = [
  "İşletme Bilgileri",
  "Konum ve Ulaşım",
  "Birim Tipleri",
  "Fiyatlandırma",
  "Özel Özellikler",
  "Kurallar",
  "İptal Politikası",
  "Depozito ve Ödeme",
  "Çevre Bilgileri",
  "Acil Durum",
  "Kişisel Karşılama",
  "Onay ve Yayınla",
] as const;

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  business: {
    businessName: "",
    businessType: "bungalow",
    address: "",
    city: "",
    phone: "",
    whatsappNumber: "",
    email: "",
  },
  location: {
    latitude: null,
    longitude: null,
    directions: "",
    parkingInfo: "",
    parkingAvailable: true,
  },
  units: [
    {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      capacity: 2,
      count: 1,
      basePrice: 0,
      weekendPrice: 0,
      amenities: [],
    },
  ],
  pricing: {
    currency: "TRY",
    seasonalAdjustments: [],
    minimumStayNights: 1,
  },
  amenities: {
    jacuzzi: false,
    pool: false,
    bbq: true,
    kitchen: true,
    wifi: true,
    ac: true,
    parking: true,
    garden: true,
    tv: true,
    fireplace: false,
    washingMachine: false,
    petFriendly: false,
  },
  rules: {
    checkInTime: "14:00",
    checkOutTime: "11:00",
    petPolicy: "on_request",
    petDetails: "",
    smokingPolicy: "outdoor_only",
    smokingDetails: "",
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    additionalRules: "",
  },
  cancellation: {
    policyType: "moderate",
    freeCancellationDays: 7,
    refundPercentages: [
      { daysBefore: 7, refundPercentage: 100 },
      { daysBefore: 3, refundPercentage: 50 },
      { daysBefore: 0, refundPercentage: 0 },
    ],
    customPolicy: "",
  },
  depositPayment: {
    depositPercentage: 30,
    depositType: "percentage",
    depositFixedAmount: 0,
    iban: "",
    bankName: "",
    accountHolder: "",
    paymentMethods: ["havale"],
  },
  surroundings: {
    nearbyMarkets: "",
    nearbyRestaurants: "",
    nearbyAttractions: "",
    nearbyTransport: "",
    distanceToBeach: "",
    distanceToAirport: "",
    distanceToCenter: "",
  },
  emergency: {
    emergencyContactName: "",
    emergencyContactPhone: "",
    nearestHospital: "",
    nearestHospitalPhone: "",
    nearestPolice: "",
    nearestPolicePhone: "",
    fireDepartment: "110",
    additionalContacts: "",
  },
  greeting: {
    greetingMessage: "",
    personaName: "Elif",
    personaTone: "warm",
    welcomeNote: "",
    autoReplyEnabled: true,
  },
};
