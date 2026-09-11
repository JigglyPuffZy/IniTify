import {
  formatWeatherObservationTime,
  parseOpenMeteoObservationTime,
} from '@/src/utils/weather-display';

describe('weather display', () => {
  it('parses Open-Meteo Manila local time as Philippine instant', () => {
    const iso = parseOpenMeteoObservationTime('2026-09-06T04:00');
    expect(iso).toContain('2026-09-05T'); // 4 AM PHT = previous UTC day 20:00Z
    expect(formatWeatherObservationTime(iso)).toMatch(/PHT/);
    expect(formatWeatherObservationTime(iso)).toMatch(/4:00/);
  });
});
