/**
 * Computes heat index (°C) from air temperature (°C) and relative humidity (%).
 * Uses the Rothfusz regression (NWS/NOAA) with Celsius conversion.
 * Used when a weather provider does not return a dedicated heat-index field
 * (e.g. Open-Meteo: compute from temperature_2m + relative_humidity_2m).
 */
export function computeHeatIndexFromTempHumidity(
  tempCelsius: number,
  relativeHumidity: number,
): number | null {
  if (
    Number.isNaN(tempCelsius) ||
    Number.isNaN(relativeHumidity) ||
    relativeHumidity < 0 ||
    relativeHumidity > 100
  ) {
    return null;
  }

  // Rothfusz regression expects °F
  const tempF = (tempCelsius * 9) / 5 + 32;
  const rh = relativeHumidity;

  let hiF: number;

  if (tempF < 80) {
    hiF = 0.5 * (tempF + 61 + (tempF - 68) * 1.2 + rh * 0.094);
  } else {
    hiF =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * rh -
      0.22475541 * tempF * rh -
      0.00683783 * tempF * tempF -
      0.05481717 * rh * rh +
      0.00122874 * tempF * tempF * rh +
      0.00085282 * tempF * rh * rh -
      0.00000199 * tempF * tempF * rh * rh;

    if (rh < 13 && tempF >= 80 && tempF <= 112) {
      hiF -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
    } else if (rh > 85 && tempF >= 80 && tempF <= 87) {
      hiF += ((rh - 85) / 10) * ((87 - tempF) / 5);
    }
  }

  const hiC = ((hiF - 32) * 5) / 9;
  return Math.round(hiC * 10) / 10;
}

export type HeatIndexComputationMethod = 'direct' | 'computed-from-weather';
