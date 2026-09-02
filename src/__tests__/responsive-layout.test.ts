import {
  buildResponsiveMetrics,
  computeBentoTileWidth,
  horizontalPaddingForWidth,
  scaleSize,
} from '@/src/utils/responsive';

const insets = { top: 0, right: 0, bottom: 0, left: 0 };

describe('responsive layout helpers', () => {
  it('scales down on narrow widths and up slightly on large phones', () => {
    expect(scaleSize(72, 320)).toBeLessThan(72);
    expect(scaleSize(72, 390)).toBe(72);
    expect(scaleSize(72, 430)).toBeGreaterThanOrEqual(72);
  });

  it('uses tighter horizontal padding on compact screens', () => {
    expect(horizontalPaddingForWidth(320)).toBe(16);
    expect(horizontalPaddingForWidth(375)).toBe(20);
    expect(horizontalPaddingForWidth(430)).toBe(24);
  });

  it('fits two bento tiles within content width without overflow', () => {
    const width = 320;
    const pad = horizontalPaddingForWidth(width);
    const tile = computeBentoTileWidth(width, pad, 12);
    expect(tile * 2 + 12).toBeLessThanOrEqual(width - pad * 2);
  });

  it('marks very narrow screens for stacked layouts', () => {
    const narrow = buildResponsiveMetrics(320, 640, insets);
    expect(narrow.isCompact).toBe(true);
    expect(narrow.hideStepLabels).toBe(false);
    expect(narrow.stackRiskActions).toBe(true);

    const tiny = buildResponsiveMetrics(300, 640, insets);
    expect(tiny.hideStepLabels).toBe(true);
  });
});
