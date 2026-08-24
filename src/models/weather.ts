/** Live current weather for Tuguegarao study area (Open-Meteo) */
export interface CurrentWeatherSnapshot {
  locationName: string;
  tempC: number;
  feelsLikeC: number;
  heatIndexC: number;
  humidity: number;
  conditionText: string;
  conditionIconUrl: string;
  windKph: number;
  windDir: string;
  isDay: boolean;
  lastUpdated: string;
  source: 'open-meteo';
}
