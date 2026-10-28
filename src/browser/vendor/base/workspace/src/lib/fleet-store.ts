import{storagePrefix}from"./../../../../../profiles/payment-003/phrase-evidence-006/execution-connection/scope.mjs";
// Fleet management store - localStorage based
// Vulture(벌쳐) 데이터 저장소

export type DispatchStatus = "waiting" | "loaded" | "ongoing" | "completed" | "cancelled";

export const dispatchStatusLabel: Record<DispatchStatus, string> = {
  waiting: "상차대기",
  loaded: "상차완료",
  ongoing: "운행중",
  completed: "하차완료",
  cancelled: "취소",
};


export type QuantityUnit = "pallet" | "ton" | "box" | "case" | "etc";
export const quantityUnitLabel: Record<QuantityUnit, string> = {
  pallet: "파렛트",
  ton: "톤",
  box: "박스",
  case: "건",
  etc: "기타",
};

export type FareType = "per_case" | "per_ton" | "etc";
export const fareTypeLabel: Record<FareType, string> = {
  per_case: "건당",
  per_ton: "톤당",
  etc: "기타",
};

export type PaymentMethod = "invoice" | "cash" | "card" | "unpaid";
export const paymentMethodLabel: Record<PaymentMethod, string> = {
  invoice: "계산서",
  cash: "현금",
  card: "카드",
  unpaid: "미수금",
};

export type Dispatch = {
  id: string;
  dispatchNo?: string;        // 배차번호 (YYYYMMDD-001)
  dispatcherCompany?: string; // 배차회사명
  pickup: string;        // 상차지 (요약: 도시/지역)
  dropoff: string;       // 하차지 (요약: 도시/지역)
  fare: number;          // 운임 (= 총 운임)
  pickupTime?: string;   // 상차시간
  dropoffTime?: string;  // 하차시간
  pickupCompany?: string;   // 상차업체
  pickupAddress?: string;   // 상차주소 (전체)
  dock?: string;            // 도크번호
  contact?: string;         // 연락처(통합)
  pickupContactName?: string; // 상차 담당자
  pickupContact?: string;     // 상차 연락처
  dropoffContactName?: string; // 하차 담당자
  dropoffContact?: string;     // 하차 연락처
  dropoffCompany?: string;  // 하차업체
  dropoffAddress?: string;  // 하차주소 (전체)
  temperature?: string;     // 온도조건 (예: 냉동(-18°C))
  chillType?: "frozen" | "chilled" | "ambient"; // 냉장/냉동/상온
  targetTemp?: string;      // 설정 온도 (예: -18°C)
  vehicleTon?: number;      // 차량 톤수 (예: 5)
  vehicleType?: string;     // 차종 (윙바디/탑차/카고 등)
  pallets?: string;         // 파렛수 (예: 16파렛) — 호환

  company?: string;      // 업체명 / 담당자 (호환)
  cargo?: string;        // 품목 (호환)
  cargoType?: string;       // 화물 종류
  quantity?: number;        // 물량
  quantityUnit?: QuantityUnit; // 물량 단위
  fareType?: FareType;      // 운임 방식
  unitPriceTon?: number;    // 톤당 단가
  totalFare?: number;       // 총 운임
  paymentMethod?: PaymentMethod; // 수금 방식
  taxInvoice?: boolean;     // 세금계산서 발행 여부
  memo?: string;
  terms?: string[];         // 화물용어 태그 (독차/혼적/착불 등)
  lowConfidence?: string[]; // OCR 신뢰도 낮은 필드명 목록
  rawText?: string;
  status: DispatchStatus;
  createdAt: number;
  scheduledDate?: string;   // 배차 예정일 (YYYY-MM-DD) — 원문에서 파싱
  startedAt?: number;
  loadedAt?: number;
  completedAt?: number;
  // === 대표 사진 / 첨부 이력 (하위 호환 optional) ===
  primaryPhotoId?: string;
  attachmentHistory?: Array<{
    type: "attach" | "link" | "replace-primary" | "unlink";
    attachmentId: string;
    previousAttachmentId?: string;
    source?: string;
    createdAt: number;
  }>;
};


export type ExpenseKind = "fuel" | "urea" | "toll" | "meal" | "repair" | "wash" | "supplies" | "lodging" | "etc";
export const expenseLabel: Record<ExpenseKind, string> = {
  fuel: "주유",
  urea: "요소수",
  toll: "통행료",
  meal: "식대",
  repair: "정비",
  wash: "세차",
  supplies: "소모품",
  lodging: "숙박",
  etc: "기타",
};

// 이전 카테고리 호환 (구버전 데이터)
export function normalizeExpenseKind(k: string): ExpenseKind {
  if (k === "fuel" || k === "urea" || k === "toll" || k === "meal"
    || k === "repair" || k === "wash" || k === "supplies" || k === "lodging"
    || k === "etc") return k;
  return "etc";
}

export type Expense = {
  sourceFuelingId?: string; // Explicit same-payment link, never inferred.
  id: string;
  kind: ExpenseKind;
  amount: number;
  date: string;
  memo?: string;
  receipts?: string[]; // data URLs of attached receipt photos
  createdAt: number;
};


export type MaintenanceKind = "oil" | "tire" | "etc";
export const maintenanceLabel: Record<MaintenanceKind, string> = {
  oil: "엔진오일",
  tire: "타이어",
  etc: "기타정비",
};

export type Maintenance = {
  id: string;
  kind: MaintenanceKind;
  date: string;
  odometer?: number;
  cost?: number;
  memo?: string;
  receiptPhotos?: string[];   // 정비 영수증 사진 (data URLs)
  partPhotos?: string[];      // 차량 부품 사진
  odometerPhotos?: string[];  // 계기판 주행거리 사진
  vehicleNumber?: string;     // 차량번호
  parts?: string[];           // 교체부품 목록
  laborCost?: number;         // 공임
  sourceDocType?: "maintenance" | "trade_statement" | "etc_receipt"; // 우선순위 추적
  createdAt: number;
};

export type FineStatus = "unpaid" | "paid";
export type Overload = {
  id: string;
  date: string;                  // 위반일자 (YYYY-MM-DD)
  location?: string;             // 위반장소
  fineAmount?: number;           // 부과금액
  excludeFrom?: string;          // 심야할인 제외 시작
  excludeTo?: string;            // 심야할인 제외 종료
  memo?: string;
  // 확장: 단속/과태료 통지서 자동 등록
  vehicleNumber?: string;        // 차량번호
  violationTime?: string;        // 위반일시 원문 (HH:MM)
  violationType?: string;        // 위반내용 (과적/높이제한/통행제한/속도 등)
  dueDate?: string;              // 납부기한 (YYYY-MM-DD)
  paidDate?: string;             // 납부완료일 (YYYY-MM-DD)
  status?: FineStatus;           // 납부 상태 (기본 unpaid)
  issuer?: string;               // 발급기관 (경찰서/지자체/국토관리청 등)
  caseNumber?: string;           // 사건번호/고지번호
  photos?: string[];             // 원본 사진 (data URLs)
  createdAt: number;
};

import { defaultVehicleInfo, type VehicleInfo } from "./vehicle-presets.ts";

export type PriceEntry = {
  id: string;
  dischargeCompany: string;   // 배출업체
  treatmentCompany: string;   // 처리업체
  item?: string;              // 품목
  transport: number;          // 운반비
  tax: number;                // 부가세
  total: number;              // 합계액
  memo?: string;
  updatedAt: number;
};

// 운행일지 (음성/수동 입력)
export type TripLog = {
  id: string;
  date: string;          // 운행일 (YYYY-MM-DD)
  origin: string;        // 출발지
  destination: string;   // 도착지
  distanceKm?: number;   // 거리 (km)
  pickupTime?: string;   // 상차시간 (HH:MM)
  dropoffTime?: string;  // 하차시간 (HH:MM)
  memo?: string;
  rawTranscript?: string; // 음성 원문 (있으면)
  createdAt: number;
};

// 주유 기록
export type FuelType = "diesel" | "gasoline" | "lpg" | "etc";
export const fuelTypeLabel: Record<FuelType, string> = {
  diesel: "경유",
  gasoline: "휘발유",
  lpg: "LPG",
  etc: "기타",
};

export type Fueling = {
  id: string;
  date: string;           // YYYY-MM-DD
  time?: string;          // HH:MM
  station?: string;       // 주유소명
  fuelType?: FuelType;    // 유종
  liters?: number;        // 주유량(L)
  unitPrice?: number;     // 리터당 단가
  amount: number;         // 총 금액
  paymentMethod?: string; // 카드사/결제수단
  odometer?: number;      // 주행거리 (km)
  vehicleNumber?: string;
  memo?: string;
  receipts?: string[];    // 영수증 사진 data URLs
  createdAt: number;
};

// ============================================================
// 업무 첨부 (work_attachments)
// 하나의 "업무" (배차/정비/주유 등) 에 여러 자료(사진·음성·문자·PDF)를
// 시간순으로 묶기 위한 공통 컬렉션.
// ============================================================
export type WorkType = "dispatch" | "maintenance" | "fueling";
export const workTypeLabel: Record<WorkType, string> = {
  dispatch: "배차",
  maintenance: "정비",
  fueling: "주유",
};

export type AttachmentKind = "image" | "voice" | "text" | "pdf";
export const attachmentKindLabel: Record<AttachmentKind, string> = {
  image: "사진",
  voice: "음성",
  text: "메모",
  pdf: "PDF",
};

// 직렬화 가능한 JSON 값 (TanStack server-fn 직렬화기 호환)
export type JsonValue =
  | string | number | boolean | null
  | { [k: string]: JsonValue }
  | JsonValue[];

export type WorkAttachment = {
  id: string;
  workType: WorkType;
  workId: string;
  kind: AttachmentKind;
  label?: string;
  docType?: string;
  dataUrl?: string;
  text?: string;
  extracted?: { [k: string]: JsonValue };
  confidence?: number;
  createdAt: number;
};

export type StoreShape = {
  dispatches: Dispatch[];
  expenses: Expense[];
  maintenances: Maintenance[];
  overloads: Overload[];
  vehicle: VehicleInfo;
  priceBook: PriceEntry[];
  tripLogs: TripLog[];
  fuelings: Fueling[];
  workAttachments: WorkAttachment[];
};

const KEY = storagePrefix+"fleet-store-v1";

// 사용자별 네임스페이스 — 단일 기기에서 계정 전환 시 데이터 혼재 방지.
// userId 없으면 anon 스코프, 있으면 `${KEY}:${uid}` 로 분리.
let currentUserId: string | null = null;

function storageKey(): string {
  return currentUserId ? `${KEY}:${currentUserId}` : `${KEY}:anon`;
}

/**
 * 인증 상태 변경 시 호출. 동일 uid 재호출은 무시.
 * 최초 로그인 시 legacy `fleet-store-v1` 데이터를 사용자 키로 1회 마이그레이션.
 */
export function setStoreUser(uid: string | null) {
  if (currentUserId === uid) return;
  currentUserId = uid;
  if (typeof window !== "undefined") {
    if (uid) {
      const userKey = `${KEY}:${uid}`;
      try {
        if (!localStorage.getItem(userKey)) {
          const legacy = localStorage.getItem(KEY);
          if (legacy) {
            localStorage.setItem(userKey, legacy);
            localStorage.removeItem(KEY);
          }
        }
      } catch { /* quota / private mode */ }
    }
    window.dispatchEvent(new Event("fleet-store-changed"));
  }
}

/** cloud-sync 가 cloud snapshot 으로 로컬 캐시를 갱신할 때 사용 (현재 사용자 키에 기록). */
export function writeStoreRaw(snapshot: StoreShape) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(storageKey(), JSON.stringify(snapshot)); } catch { /* quota */ }
}

export function emptyStore(): StoreShape {
  return {
    dispatches: [], expenses: [], maintenances: [], overloads: [],
    vehicle: defaultVehicleInfo(),
    priceBook: [],
    tripLogs: [],
    fuelings: [],
    workAttachments: [],
  };
}

// 업무에 첨부 추가 (편의 함수)
export function attachToWork(
  workType: WorkType,
  workId: string,
  partial: Omit<WorkAttachment, "id" | "workType" | "workId" | "createdAt"> & { createdAt?: number },
): WorkAttachment {
  const att: WorkAttachment = {
    id: uid(),
    workType,
    workId,
    createdAt: partial.createdAt ?? Date.now(),
    ...partial,
  };
  const { ok } = updateStore((s) => ({ ...s, workAttachments: [att, ...s.workAttachments] }));
  if (!ok && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.error("[fleet-store] attachToWork save failed (localStorage quota?)", { workType, workId, id: att.id });
  }
  return att;
}

/**
 * attachToWork 의 저장 성공 여부까지 알아야 하는 신규 호출부용 보조 함수.
 * 기존 attachToWork 호출부(=반환값이 WorkAttachment 인 것을 가정) 는 그대로 유지.
 */
export function attachToWorkChecked(
  workType: WorkType,
  workId: string,
  partial: Omit<WorkAttachment, "id" | "workType" | "workId" | "createdAt"> & { createdAt?: number },
): { ok: boolean; attachment: WorkAttachment } {
  const att: WorkAttachment = {
    id: uid(),
    workType,
    workId,
    createdAt: partial.createdAt ?? Date.now(),
    ...partial,
  };
  const { ok } = updateStore((s) => ({ ...s, workAttachments: [att, ...s.workAttachments] }));
  return { ok, attachment: att };
}



// 한 업무의 첨부 목록 (시간순)
export function getAttachments(s: StoreShape, workType: WorkType, workId: string): WorkAttachment[] {
  return s.workAttachments
    .filter((a) => a.workType === workType && a.workId === workId)
    .sort((a, b) => a.createdAt - b.createdAt);
}


// 이전 상태값 호환
function normalizeStatus(s: string): DispatchStatus {
  if (s === "pending") return "waiting";
  if (s === "done") return "completed";
  if (s === "waiting" || s === "loaded" || s === "ongoing" || s === "completed" || s === "cancelled") return s;
  return "waiting";
}

export function loadStore(): StoreShape {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return emptyStore();
    const base = emptyStore();
    const parsed = { ...base, ...JSON.parse(raw) } as StoreShape;
    parsed.dispatches = parsed.dispatches.map((d) => ({
      ...d,
      status: normalizeStatus(d.status as unknown as string),
    }));
    parsed.vehicle = {
      ...base.vehicle,
      ...(parsed.vehicle || {}),
      intervals: { ...base.vehicle.intervals, ...((parsed.vehicle || {}).intervals || {}) },
    };
    return parsed;
  } catch {
    return emptyStore();
  }
}

/**
 * localStorage 저장. 성공 시 true, 실패(quota 등) 시 false 반환.
 * 실패 시 fleet-store-changed 이벤트를 발생시키지 않아 UI 가
 * "저장된 것처럼" 보이지 않도록 한다.
 */
export function saveStore(s: StoreShape): boolean {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(s));
  } catch (err) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[fleet-store] saveStore failed", err);
    }
    return false;
  }
  window.dispatchEvent(new Event("fleet-store-changed"));
  return true;
}

export type UpdateStoreResult = { ok: boolean; snapshot: StoreShape };

export function updateStore(fn: (s: StoreShape) => StoreShape): UpdateStoreResult {
  const next = fn(loadStore());
  const ok = saveStore(next);
  return { ok, snapshot: next };
}

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWon(n: number) {
  return (n || 0).toLocaleString("ko-KR") + "원";
}

// === 배차 텍스트 파싱 (정규식 폴백) ===
export type ParsedDispatch = {
  pickup?: string;
  dropoff?: string;
  fare?: number;
  pickupTime?: string;
  dropoffTime?: string;
  company?: string;
  cargo?: string;
  memo?: string;
};

export function parseDispatchText(text: string): ParsedDispatch {
  const result: ParsedDispatch = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const grab = (re: RegExp): string | undefined => {
    for (const l of lines) {
      const m = l.match(re);
      if (m) return m[1].trim();
    }
    return undefined;
  };

  result.pickup =
    grab(/(?:상차지?|출발지?|상차|픽업|적재지?)\s*[:：\-]?\s*(.+)/) ||
    grab(/(?:from|출발)\s*[:：\-]?\s*(.+)/i);

  result.dropoff =
    grab(/(?:하차지?|도착지?|하차|배송지?|목적지)\s*[:：\-]?\s*(.+)/) ||
    grab(/(?:to|도착)\s*[:：\-]?\s*(.+)/i);

  result.cargo = grab(/(?:품목|화물|물품|품명)\s*[:：\-]?\s*(.+)/);
  result.company = grab(/(?:업체|회사|담당자|담당|화주)\s*[:：\-]?\s*(.+)/);
  result.pickupTime = grab(/(?:상차시간|상차일시|상차)\s*[:：\-]?\s*(.+(?:시|:\d{2}).*)/);
  result.dropoffTime = grab(/(?:하차시간|하차일시|도착시간|하차예정)\s*[:：\-]?\s*(.+)/);

  const fareLine = lines.find((l) => /(운임|금액|단가|요금|운송료)/.test(l)) ?? text;
  const manMatch = fareLine.match(/([\d,]+(?:\.\d+)?)\s*만\s*원?/);
  const wonMatch = fareLine.match(/([\d,]{4,})\s*원/);
  if (manMatch) {
    result.fare = Math.round(parseFloat(manMatch[1].replace(/,/g, "")) * 10000);
  } else if (wonMatch) {
    result.fare = parseInt(wonMatch[1].replace(/,/g, ""), 10);
  }

  return result;
}
