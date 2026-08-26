import {
  classifyHydrationFromLiters,
  classifyHydrationFromText,
  cupsToLiters,
  CUP_ML,
  HYDRATION_VOLUME_THRESHOLDS,
  parseWaterIntakeAmount,
} from '@/src/utils/hydration-volume';

describe('hydration volume', () => {
  it('uses 250 ml per cup', () => {
    expect(CUP_ML).toBe(250);
    expect(cupsToLiters(4)).toBe(1);
  });

  it('parses cups from text', () => {
    const parsed = parseWaterIntakeAmount('4 cups');
    expect(parsed?.liters).toBe(1);
    expect(parsed?.cups).toBe(4);
  });

  it('parses liters from text', () => {
    const parsed = parseWaterIntakeAmount('1.5 L');
    expect(parsed?.liters).toBe(1.5);
  });

  it('parses ml from text', () => {
    const parsed = parseWaterIntakeAmount('500 ml');
    expect(parsed?.liters).toBe(0.5);
  });

  it('classifies well hydrated at 2 L or more', () => {
    expect(classifyHydrationFromLiters(2)).toBe('Well Hydrated');
    expect(classifyHydrationFromLiters(2.5)).toBe('Well Hydrated');
  });

  it('classifies moderate hydration between 1 and 2 L', () => {
    expect(classifyHydrationFromLiters(1)).toBe('Needs Hydration');
    expect(classifyHydrationFromLiters(1.5)).toBe('Needs Hydration');
  });

  it('classifies dehydrated below 1 L', () => {
    expect(classifyHydrationFromLiters(0.5)).toBe('Dehydrated / Concerning');
  });

  it('classifies from quick-reply style text', () => {
    const result = classifyHydrationFromText('8 cups (2 L)');
    expect(result?.status).toBe('Well Hydrated');
    expect(result?.intake.liters).toBe(2);
  });

  it('documents adviser thresholds', () => {
    expect(HYDRATION_VOLUME_THRESHOLDS.wellHydratedMinLiters).toBe(2);
    expect(HYDRATION_VOLUME_THRESHOLDS.moderateMinLiters).toBe(1);
  });
});
