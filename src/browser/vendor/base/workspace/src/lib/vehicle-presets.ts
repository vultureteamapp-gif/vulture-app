// 차종별 정비 주기 프리셋 (참고용 기본값)
// 추후 데이터 추가가 쉽도록 배열 형태로 관리합니다.

export type TransmissionKind = "manual" | "automatic";
export const transmissionLabel: Record<TransmissionKind, string> = {
  manual: "수동",
  automatic: "자동",
};

export type MaintenanceItemKey =
  | "engineOil"
  | "missionOil"
  | "deffOil"
  | "brake"
  | "coolant"
  | "airFilter"
  | "fuelFilter"
  | "ureaFilter"
  | "tire"
  | "battery";

export const maintenanceItemLabel: Record<MaintenanceItemKey, string> = {
  engineOil: "엔진오일",
  missionOil: "미션오일",
  deffOil: "데후오일",
  brake: "브레이크 점검",
  coolant: "냉각수",
  airFilter: "에어필터",
  fuelFilter: "연료필터",
  ureaFilter: "요소수 필터",
  tire: "타이어 점검",
  battery: "배터리 점검",
};

export const MAINTENANCE_ITEM_KEYS: MaintenanceItemKey[] = [
  "engineOil", "missionOil", "deffOil", "brake", "coolant",
  "airFilter", "fuelFilter", "ureaFilter", "tire", "battery",
];

export type MaintenanceIntervals = Record<MaintenanceItemKey, number>; // km 단위

// 일반 대형 트럭 기준 기본 주기 (참고용)
export const DEFAULT_INTERVALS: MaintenanceIntervals = {
  engineOil: 20000,
  missionOil: 60000,
  deffOil: 60000,
  brake: 20000,
  coolant: 40000,
  airFilter: 20000,
  fuelFilter: 40000,
  ureaFilter: 60000,
  tire: 10000,
  battery: 20000,
};

export type VehiclePreset = {
  id: string;
  manufacturer: string;
  model: string;
  year?: number;
  ton: number;
  transmission: TransmissionKind;
  intervals: MaintenanceIntervals;
};

export const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    id: "hd-xcient-25-2018-at",
    manufacturer: "현대",
    model: "엑시언트",
    year: 2018,
    ton: 25,
    transmission: "automatic",
    intervals: {
      engineOil: 20000, missionOil: 60000, deffOil: 60000,
      brake: 20000, coolant: 40000, airFilter: 20000,
      fuelFilter: 40000, ureaFilter: 60000, tire: 10000, battery: 20000,
    },
  },
  {
    id: "hd-xcient-11-at",
    manufacturer: "현대",
    model: "엑시언트",
    ton: 11,
    transmission: "automatic",
    intervals: {
      engineOil: 20000, missionOil: 60000, deffOil: 60000,
      brake: 20000, coolant: 40000, airFilter: 20000,
      fuelFilter: 40000, ureaFilter: 60000, tire: 10000, battery: 20000,
    },
  },
  {
    id: "hd-megatruck-5",
    manufacturer: "현대",
    model: "메가트럭",
    ton: 5,
    transmission: "manual",
    intervals: {
      engineOil: 15000, missionOil: 50000, deffOil: 50000,
      brake: 15000, coolant: 40000, airFilter: 20000,
      fuelFilter: 30000, ureaFilter: 60000, tire: 10000, battery: 20000,
    },
  },
  {
    id: "td-prima-25",
    manufacturer: "타타대우",
    model: "프리마",
    ton: 25,
    transmission: "automatic",
    intervals: {
      engineOil: 20000, missionOil: 60000, deffOil: 60000,
      brake: 20000, coolant: 40000, airFilter: 20000,
      fuelFilter: 40000, ureaFilter: 60000, tire: 10000, battery: 20000,
    },
  },
  {
    id: "td-novus-25",
    manufacturer: "타타대우",
    model: "노부스",
    ton: 25,
    transmission: "manual",
    intervals: {
      engineOil: 20000, missionOil: 60000, deffOil: 60000,
      brake: 20000, coolant: 40000, airFilter: 20000,
      fuelFilter: 40000, ureaFilter: 60000, tire: 10000, battery: 20000,
    },
  },
];

export function findPreset(id: string | undefined): VehiclePreset | undefined {
  if (!id) return undefined;
  return VEHICLE_PRESETS.find((p) => p.id === id);
}

export type FuelKind = "diesel" | "gasoline" | "lpg" | "cng" | "electric" | "hybrid";
export const fuelLabel: Record<FuelKind, string> = {
  diesel: "경유",
  gasoline: "휘발유",
  lpg: "LPG",
  cng: "CNG",
  electric: "전기",
  hybrid: "하이브리드",
};

// === V1.1 차량 형태 (body type) ===
export type VehicleBodyType =
  | "cargo" | "wing" | "reefer_wing" | "reefer_top" | "walking"
  | "armroll" | "dump" | "tanker" | "bulk" | "trailer" | "etc";

export const vehicleBodyTypeLabel: Record<VehicleBodyType, string> = {
  cargo: "카고",
  wing: "윙바디",
  reefer_wing: "냉동윙바디",
  reefer_top: "냉장탑",
  walking: "워킹카",
  armroll: "암롤(압롤)",
  dump: "덤프",
  tanker: "탱크로리",
  bulk: "벌크",
  trailer: "트레일러",
  etc: "기타",
};

export const VEHICLE_BODY_TYPES: VehicleBodyType[] = [
  "cargo", "wing", "reefer_wing", "reefer_top", "walking",
  "armroll", "dump", "tanker", "bulk", "trailer", "etc",
];

export type VehicleCategory = "freight" | "other";
export type VehicleUsage = "commercial" | "private" | "other";

export type VehicleInfo = {
  presetId?: string; // "custom" 또는 VEHICLE_PRESETS의 id
  manufacturer?: string;
  model?: string;
  year?: number;
  ton?: number;
  transmission?: TransmissionKind;
  odometer?: number; // km
  intervals: MaintenanceIntervals;
  // 차량등록증 OCR 확장 필드 (모두 optional — 기존 저장 데이터 호환)
  plateNumber?: string;
  fuel?: FuelKind;
  payloadKg?: number;
  vin?: string;
  inspectionValidUntil?: string; // YYYY-MM-DD
  lastInspectionOdometer?: number;
  inspectionAlertEnabled?: boolean;
  // === V1.1 인증/분류/정책 (모두 optional — 기존 데이터 호환) ===
  bodyType?: VehicleBodyType;          // 차량 형태
  vehicleCategory?: VehicleCategory;   // 차종 (화물 여부)
  usage?: VehicleUsage;                // 용도 (영업용 여부)
  certConsentAt?: number;              // 등록증 등록 안내 동의 시각
  certifiedAt?: number;                // 차량 인증(화물+영업용+차량번호 확인) 시각
  pendingOwnershipReview?: boolean;    // 동일 차량번호가 다른 등록자에서 발견됨 → 운영자 확인 요청
  companyContract?: boolean;           // 회사 계약/전속 차량 — 운임 공유 제외 대상
  shareAnonStats?: boolean;            // 공개 콜 익명 통계 활용 동의
};

export function defaultVehicleInfo(): VehicleInfo {
  return { intervals: { ...DEFAULT_INTERVALS } };
}
