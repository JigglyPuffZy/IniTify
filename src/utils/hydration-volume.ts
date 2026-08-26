import type { HydrationStatus } from '@/src/models/user';

/** Standard cup size used in IniTify check-ins (aligned with common 250 ml glass). */
export const CUP_ML = 250;

/**
 * Classify hydration from reported fluid intake today (so far).
 * Thresholds are for thesis demo guidance under heat (not a clinical diagnosis):
 * - Well Hydrated: ≥ 2.0 L (≥ 8 cups)
 * - Needs Hydration (moderate): 1.0–1.99 L (4–7 cups)
 * - Dehydrated / Concerning: < 1.0 L (< 4 cups)
 */
export const HYDRATION_VOLUME_THRESHOLDS = {
  wellHydratedMinLiters: 2.0,
  moderateMinLiters: 1.0,
} as const;

export interface ParsedWaterIntake {
  liters: number;
  cups: number;
  ml: number;
  sourceText: string;
}

export function cupsToLiters(cups: number): number {
  return (cups * CUP_ML) / 1000;
}

export function litersToCups(liters: number): number {
  return Math.round((liters * 1000) / CUP_ML);
}

export function classifyHydrationFromLiters(liters: number): HydrationStatus {
  if (liters >= HYDRATION_VOLUME_THRESHOLDS.wellHydratedMinLiters) return 'Well Hydrated';
  if (liters >= HYDRATION_VOLUME_THRESHOLDS.moderateMinLiters) return 'Needs Hydration';
  return 'Dehydrated / Concerning';
}

/**
 * Parse cups / ml / liters from free text, e.g.:
 * "2 cups", "500ml", "1.5 L", "1 liter", "I drank 3 glasses"
 */
export function parseWaterIntakeAmount(text: string): ParsedWaterIntake | null {
  const raw = text.trim().toLowerCase().replace(/,/g, '');
  if (!raw) return null;

  // "8 cups" / "3 cup" / "2 glasses" / "4 glass"
  const cupsMatch = raw.match(
    /(\d+(?:\.\d+)?)\s*(?:cups?|glasses?|baso|kapirasong?\s*baso)/i,
  );
  if (cupsMatch) {
    const cups = Number.parseFloat(cupsMatch[1]);
    if (!Number.isFinite(cups) || cups < 0) return null;
    const liters = cupsToLiters(cups);
    return {
      liters: Math.round(liters * 100) / 100,
      cups: Math.round(cups * 10) / 10,
      ml: Math.round(cups * CUP_ML),
      sourceText: text.trim(),
    };
  }

  // "500 ml" / "750ml" / "1000 milliliters"
  const mlMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?|millilitres?)/i);
  if (mlMatch) {
    const ml = Number.parseFloat(mlMatch[1]);
    if (!Number.isFinite(ml) || ml < 0) return null;
    const liters = ml / 1000;
    return {
      liters: Math.round(liters * 100) / 100,
      cups: Math.round((ml / CUP_ML) * 10) / 10,
      ml: Math.round(ml),
      sourceText: text.trim(),
    };
  }

  // "2 L" / "1.5 liters" / "1 litre"
  const literMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:l|liters?|litres?)\b/i);
  if (literMatch) {
    const liters = Number.parseFloat(literMatch[1]);
    if (!Number.isFinite(liters) || liters < 0) return null;
    return {
      liters: Math.round(liters * 100) / 100,
      cups: litersToCups(liters),
      ml: Math.round(liters * 1000),
      sourceText: text.trim(),
    };
  }

  return null;
}

export function classifyHydrationFromText(text: string): {
  status: HydrationStatus;
  intake: ParsedWaterIntake;
} | null {
  const intake = parseWaterIntakeAmount(text);
  if (!intake) return null;
  return {
    status: classifyHydrationFromLiters(intake.liters),
    intake,
  };
}

export function formatHydrationClassification(status: HydrationStatus, intake: ParsedWaterIntake): string {
  const label =
    status === 'Well Hydrated'
      ? 'well hydrated'
      : status === 'Needs Hydration'
        ? 'moderately hydrated (needs more water)'
        : 'dehydrated / concerning';
  return `Logged ${intake.liters} L (~${intake.cups} cups of ${CUP_ML} ml). Classified as ${label}.`;
}

/** Quick-reply chips for check-in water amount */
export const WATER_INTAKE_QUICK_REPLIES = [
  '1 cup (250 ml)',
  '2 cups (500 ml)',
  '4 cups (1 L)',
  '6 cups (1.5 L)',
  '8 cups (2 L)',
  '10 cups (2.5 L)',
] as const;
