/**
 * Weather API Client
 * Sử dụng Open-Meteo API (miễn phí, không cần API key)
 * Docs: https://open-meteo.com/en/docs
 */

import { debugLog } from '../../../core/logger/logger.js';
import { http } from '../../../shared/utils/httpClient.js';

const OPEN_METEO_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // Tỉnh/thành phố
  timezone: string;
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  apparentTemperature: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  apparentTemperatureMax: number;
  apparentTemperatureMin: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  weatherDescription: string;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  windSpeedMax: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  apparentTemperature: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  cloudCover: number;
  visibility: number;
  isDay: boolean;
}

export interface WeatherResult {
  location: GeoLocation;
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  timezone: string;
  timezoneAbbreviation: string;
}

export interface WeatherParams {
  location: string;
  days?: number; // Số ngày dự báo (1-16)
  hourlyHours?: number; // Số giờ dự báo theo giờ (0-168)
}

// ═══════════════════════════════════════════════════
// WEATHER CODE MAPPING
// ═══════════════════════════════════════════════════

const WEATHER_CODES: Record<number, string> = {
  0: 'Trời quang',
  1: 'Chủ yếu quang đãng',
  2: 'Có mây rải rác',
  3: 'Nhiều mây',
  45: 'Sương mù',
  48: 'Sương mù đọng băng',
  51: 'Mưa phùn nhẹ',
  53: 'Mưa phùn vừa',
  55: 'Mưa phùn dày đặc',
  56: 'Mưa phùn đóng băng nhẹ',
  57: 'Mưa phùn đóng băng dày',
  61: 'Mưa nhỏ',
  63: 'Mưa vừa',
  65: 'Mưa to',
  66: 'Mưa đóng băng nhẹ',
  67: 'Mưa đóng băng nặng',
  71: 'Tuyết rơi nhẹ',
  73: 'Tuyết rơi vừa',
  75: 'Tuyết rơi dày',
  77: 'Hạt tuyết',
  80: 'Mưa rào nhẹ',
  81: 'Mưa rào vừa',
  82: 'Mưa rào mạnh',
  85: 'Tuyết rào nhẹ',
  86: 'Tuyết rào nặng',
  95: 'Giông bão',
  96: 'Giông bão kèm mưa đá nhẹ',
  99: 'Giông bão kèm mưa đá nặng',
};

function getWeatherDescription(code: number): string {
  return WEATHER_CODES[code] || 'Không xác định';
}

// ═══════════════════════════════════════════════════
// GEOCODING
// ═══════════════════════════════════════════════════

/**
 * Tìm tọa độ từ tên địa điểm
 */
export async function geocodeLocation(query: string): Promise<GeoLocation | null> {
  try {
    debugLog('WEATHER', `Geocoding: ${query}`);

    const response = await http
      .get(GEOCODING_API, {
        searchParams: {
          name: query,
          count: 5,
          language: 'vi',
          format: 'json',
        },
      })
      .json<{ results?: GeoLocation[] }>();

    if (!response.results || response.results.length === 0) {
      debugLog('WEATHER', `Không tìm thấy địa điểm: ${query}`);
      return null;
    }

    // Ưu tiên kết quả Việt Nam nếu có
    const vnResult = response.results.find(
      (r) => r.country === 'Việt Nam' || r.country === 'Vietnam',
    );
    const result = vnResult || response.results[0];

    debugLog('WEATHER', `Found: ${result.name}, ${result.admin1 || ''}, ${result.country}`);
    return result;
  } catch (error: any) {
    debugLog('WEATHER', `Geocoding error: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════
// WEATHER API
// ═══════════════════════════════════════════════════

/**
 * Lấy thông tin thời tiết từ Open-Meteo API
 */
export async function getWeather(params: WeatherParams): Promise<WeatherResult> {
  const { location, days = 7, hourlyHours = 24 } = params;

  // Geocode location
  const geo = await geocodeLocation(location);
  if (!geo) {
    throw new Error(`Không tìm thấy địa điểm: ${location}`);
  }

  debugLog('WEATHER', `Fetching weather for ${geo.name} (${geo.latitude}, ${geo.longitude})`);

  // Fetch weather data
  const response = await http
    .get(OPEN_METEO_API, {
      searchParams: {
        latitude: geo.latitude.toString(),
        longitude: geo.longitude.toString(),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
          'wind_direction_10m',
          'cloud_cover',
          'pressure_msl',
          'uv_index',
          'visibility',
          'is_day',
        ].join(','),
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'apparent_temperature_max',
          'apparent_temperature_min',
          'precipitation_sum',
          'precipitation_probability_max',
          'weather_code',
          'sunrise',
          'sunset',
          'uv_index_max',
          'wind_speed_10m_max',
        ].join(','),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'precipitation_probability',
          'weather_code',
          'wind_speed_10m',
          'cloud_cover',
          'visibility',
          'is_day',
        ].join(','),
        timezone: geo.timezone || 'Asia/Ho_Chi_Minh',
        forecast_days: Math.min(days, 16).toString(),
        forecast_hours: Math.min(hourlyHours, 168).toString(),
      },
    })
    .json<any>();

  // Parse current weather
  const current: CurrentWeather = {
    temperature: response.current.temperature_2m,
    humidity: response.current.relative_humidity_2m,
    apparentTemperature: response.current.apparent_temperature,
    precipitation: response.current.precipitation,
    weatherCode: response.current.weather_code,
    weatherDescription: getWeatherDescription(response.current.weather_code),
    windSpeed: response.current.wind_speed_10m,
    windDirection: response.current.wind_direction_10m,
    cloudCover: response.current.cloud_cover,
    pressure: response.current.pressure_msl,
    uvIndex: response.current.uv_index,
    visibility: response.current.visibility,
    isDay: response.current.is_day === 1,
  };

  // Parse daily forecast
  const daily: DailyForecast[] = response.daily.time.map((date: string, i: number) => ({
    date,
    temperatureMax: response.daily.temperature_2m_max[i],
    temperatureMin: response.daily.temperature_2m_min[i],
    apparentTemperatureMax: response.daily.apparent_temperature_max[i],
    apparentTemperatureMin: response.daily.apparent_temperature_min[i],
    precipitation: response.daily.precipitation_sum[i],
    precipitationProbability: response.daily.precipitation_probability_max[i],
    weatherCode: response.daily.weather_code[i],
    weatherDescription: getWeatherDescription(response.daily.weather_code[i]),
    sunrise: response.daily.sunrise[i],
    sunset: response.daily.sunset[i],
    uvIndexMax: response.daily.uv_index_max[i],
    windSpeedMax: response.daily.wind_speed_10m_max[i],
  }));

  // Parse hourly forecast (limit to requested hours)
  const hourly: HourlyForecast[] = response.hourly.time
    .slice(0, hourlyHours)
    .map((time: string, i: number) => ({
      time,
      temperature: response.hourly.temperature_2m[i],
      humidity: response.hourly.relative_humidity_2m[i],
      apparentTemperature: response.hourly.apparent_temperature[i],
      precipitation: response.hourly.precipitation[i],
      precipitationProbability: response.hourly.precipitation_probability[i],
      weatherCode: response.hourly.weather_code[i],
      weatherDescription: getWeatherDescription(response.hourly.weather_code[i]),
      windSpeed: response.hourly.wind_speed_10m[i],
      cloudCover: response.hourly.cloud_cover[i],
      visibility: response.hourly.visibility[i],
      isDay: response.hourly.is_day[i] === 1,
    }));

  debugLog('WEATHER', `✓ Got weather: ${current.temperature}°C, ${current.weatherDescription}`);

  return {
    location: geo,
    current,
    daily,
    hourly,
    timezone: response.timezone,
    timezoneAbbreviation: response.timezone_abbreviation,
  };
}
