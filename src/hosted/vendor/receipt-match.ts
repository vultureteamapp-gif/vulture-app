/**
 * 영수증에서 읽은 차량번호 / 카드 끝 4자리로 등록 차량을 매칭한다.
 * 전체 카드번호는 추출·저장·표시하지 않는다.
 */
export type MatchVehicle = { id: string; plate_number: string; card_last_four?: string | null };
export type MatchCard = { vehicle_id: string; card_last_four: string };

export type VehicleMatchSource = "plate" | "card" | "none" | "ambiguous" | "conflict";

export type VehicleMatchResult = {
  vehicleId: string;
  source: VehicleMatchSource;
  needsConfirm: boolean;
};

const PLATE_CORE = /(\d{2,3})\s*([가-힣])\s*(\d{4})/;

/** 공백·하이픈·점 제거 후 비교용 문자열로 정규화 */
export function normalizePlate(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\s.\-_]/g, "").trim();
}

/** 지역명을 뺀 핵심부(90자8326)만 추출 */
export function plateCore(raw: unknown): string {
  const match = normalizePlate(raw).match(PLATE_CORE);
  if (!match) return "";
  return `${match[1]}${match[2]}${match[3]}`;
}

/** 영수증 원문에서 차량번호 후보를 찾는다. */
export function extractPlateNumber(text: unknown): string {
  if (typeof text !== "string") return "";
  const flat = text.replace(/[\s\-_]/g, "");
  const match = flat.match(/([가-힣]{2})?(\d{2,3}[가-힣]\d{4})/);
  if (!match) return "";
  return `${match[1] ?? ""}${match[2]}`;
}

/** 마스킹된 카드번호에서 끝 4자리만 추출 (전체 번호는 다루지 않는다) */
export function extractCardLastFour(text: unknown): string {
  if (typeof text !== "string") return "";
  const masked = text.match(/[*xX·•]{2,}[\s-]*(\d{4})(?!\d)/);
  if (masked) return masked[1]!;
  const labeled = text.match(/카드[^\n]{0,20}?(\d{4})(?!\d)/);
  if (labeled) return labeled[1]!;
  return "";
}

export function normalizeCardLastFour(raw: unknown): string {
  if (typeof raw !== "string" && typeof raw !== "number") return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 4) return "";
  return digits.slice(-4);
}

export function matchVehicleFromReceipt(input: {
  plateNumber?: string | null;
  cardLastFour?: string | null;
  vehicles: MatchVehicle[];
  cards?: MatchCard[];
}): VehicleMatchResult {
  const none: VehicleMatchResult = { vehicleId: "", source: "none", needsConfirm: false };
  const core = plateCore(input.plateNumber ?? "");
  const last4 = normalizeCardLastFour(input.cardLastFour ?? "");

  const plateMatches = core
    ? input.vehicles.filter((vehicle) => plateCore(vehicle.plate_number) === core)
    : [];

  const cardVehicleIds = new Set<string>();
  if (last4) {
    for (const card of input.cards ?? []) {
      if (normalizeCardLastFour(card.card_last_four) === last4) {
        cardVehicleIds.add(card.vehicle_id);
      }
    }
    for (const vehicle of input.vehicles) {
      if (normalizeCardLastFour(vehicle.card_last_four ?? "") === last4) {
        cardVehicleIds.add(vehicle.id);
      }
    }
  }
  const cardMatches = [...cardVehicleIds].filter((id) =>
    input.vehicles.some((vehicle) => vehicle.id === id),
  );

  if (plateMatches.length > 1) {
    return { vehicleId: "", source: "ambiguous", needsConfirm: true };
  }

  if (plateMatches.length === 1) {
    const vehicleId = plateMatches[0]!.id;
    if (cardMatches.length > 0 && !cardMatches.includes(vehicleId)) {
      return { vehicleId: "", source: "conflict", needsConfirm: true };
    }
    return { vehicleId, source: "plate", needsConfirm: false };
  }

  if (core && cardMatches.length === 0) {
    // 영수증에는 차량번호가 있는데 등록 차량에 없음 → 사용자가 확인해야 한다.
    return { vehicleId: "", source: "none", needsConfirm: true };
  }

  if (cardMatches.length === 1) {
    return { vehicleId: cardMatches[0]!, source: "card", needsConfirm: false };
  }
  if (cardMatches.length > 1) {
    return { vehicleId: "", source: "ambiguous", needsConfirm: true };
  }

  return none;
}
