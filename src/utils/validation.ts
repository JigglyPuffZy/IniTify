import type { UserRiskFactors } from '@/src/models/user';

export function validateAge(value: string): string | null {
  if (!value.trim()) return 'Age is required.';
  const age = Number(value);
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return 'Enter a valid age between 1 and 120.';
  }
  return null;
}

export function validateRequired(value: string, field: string): string | null {
  if (!value.trim()) return `${field} is required.`;
  return null;
}

export function isUserProfileComplete(factors: UserRiskFactors): boolean {
  return (
    factors.age !== null &&
    factors.healthCondition !== null &&
    factors.activityLevel !== null &&
    factors.hydrationStatus !== null
  );
}

export function validateHeatIndex(value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Heat index must be a valid number.';
  }
  if (value < 0 || value > 80) {
    return 'Heat index value is out of expected range.';
  }
  return null;
}
