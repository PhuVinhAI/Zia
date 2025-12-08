/**
 * Tool: weather - Tra cứu thời tiết theo địa điểm
 * Sử dụng Open-Meteo API (miễn phí, không cần API key)
 */

import { debugLog } from '../../../core/logger/logger.js';
import { validateParamsWithExample, WeatherSchema } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { getWeather } from '../services/weatherClient.js';

export const weatherTool: ToolDefinition = {
  name: 'weather',
  description:
    'Tra cứu thời tiết hiện tại và dự báo theo địa điểm. Hỗ trợ tất cả địa điểm trên thế giới, đặc biệt các tỉnh thành Việt Nam.',
  parameters: [
    {
      name: 'location',
      type: 'string',
      description: 'Tên địa điểm (VD: Hà Nội, Đà Nẵng, Tokyo)',
      required: true,
    },
    {
      name: 'days',
      type: 'number',
      description: 'Số ngày dự báo (1-16, mặc định 7)',
      required: false,
    },
    {
      name: 'hourlyHours',
      type: 'number',
      description: 'Số giờ dự báo theo giờ (0-168, mặc định 24)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(WeatherSchema, params, 'weather');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const result = await getWeather({
        location: data.location,
        days: data.days,
        hourlyHours: data.hourlyHours,
      });

      debugLog(
        'WEATHER',
        `Got weather for ${result.location.name}: ${result.current.temperature}°C`,
      );

      // Format response
      const response = {
        location: {
          name: result.location.name,
          region: result.location.admin1,
          country: result.location.country,
          coordinates: {
            latitude: result.location.latitude,
            longitude: result.location.longitude,
          },
        },
        timezone: result.timezone,
        current: {
          temperature: `${result.current.temperature}°C`,
          feelsLike: `${result.current.apparentTemperature}°C`,
          humidity: `${result.current.humidity}%`,
          condition: result.current.weatherDescription,
          wind: `${result.current.windSpeed} km/h`,
          windDirection: `${result.current.windDirection}°`,
          cloudCover: `${result.current.cloudCover}%`,
          pressure: `${result.current.pressure} hPa`,
          uvIndex: result.current.uvIndex,
          visibility: `${(result.current.visibility / 1000).toFixed(1)} km`,
          precipitation: `${result.current.precipitation} mm`,
          isDay: result.current.isDay,
        },
        forecast: result.daily.map((day) => ({
          date: day.date,
          condition: day.weatherDescription,
          tempMax: `${day.temperatureMax}°C`,
          tempMin: `${day.temperatureMin}°C`,
          precipitation: `${day.precipitation} mm`,
          precipitationChance: `${day.precipitationProbability}%`,
          sunrise: day.sunrise.split('T')[1],
          sunset: day.sunset.split('T')[1],
          uvIndex: day.uvIndexMax,
          windMax: `${day.windSpeedMax} km/h`,
        })),
        hourly: result.hourly.slice(0, data.hourlyHours || 24).map((hour) => ({
          time: hour.time,
          temperature: `${hour.temperature}°C`,
          condition: hour.weatherDescription,
          humidity: `${hour.humidity}%`,
          precipitationChance: `${hour.precipitationProbability}%`,
          wind: `${hour.windSpeed} km/h`,
        })),
      };

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tra cứu thời tiết: ${error.message}` };
    }
  },
};
