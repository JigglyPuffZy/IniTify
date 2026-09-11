/** LIVE badge colors with enough contrast in light and dark mode. */
export function liveIndicatorColors(isDark: boolean) {
  return isDark
    ? {
        pillBg: 'rgba(34,197,94,0.18)',
        pillBorder: 'rgba(74,222,128,0.45)',
        dot: '#4ADE80',
        dotRing: 'rgba(74,222,128,0.35)',
        text: '#86EFAC',
      }
    : {
        pillBg: '#DCFCE7',
        pillBorder: '#16A34A',
        dot: '#15803D',
        dotRing: '#BBF7D0',
        text: '#14532D',
      };
}
