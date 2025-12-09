/**
 * Integration Test: Weather API (Open-Meteo)
 * Test tra cứu thời tiết cho các khu vực Việt Nam
 */

import { describe, test, expect } from 'bun:test';
import { getWeather, geocodeLocation } from '../../../src/modules/system/services/weatherClient.js';
import { TEST_CONFIG } from '../setup.js';

// Danh sách các tỉnh thành Việt Nam để test
const VIETNAM_LOCATIONS = {
  // Miền Bắc
  north: [
    'Hà Nội',
    'Hải Phòng',
    'Hạ Long', // Thay Quảng Ninh
    'Lào Cai',
    'Sapa',
    'Ninh Bình',
    'Nam Định',
    'Thái Nguyên',
    'Bắc Ninh',
    'Hà Giang',
  ],
  // Miền Trung
  central: [
    'Đà Nẵng',
    'Huế',
    'Tam Kỳ', // Thay Quảng Nam
    'Hội An',
    'Nha Trang',
    'Quy Nhơn',
    'Dalat', // Thay Đà Lạt
    'Đồng Hới', // Thay Quảng Bình
    'Vinh', // Thay Nghệ An
    'Thanh Hóa',
  ],
  // Miền Nam
  south: [
    'Hồ Chí Minh',
    'Cần Thơ',
    'Vũng Tàu',
    'Biên Hòa',
    'Bình Dương',
    'Long An',
    'Tiền Giang',
    'Phú Quốc',
    'Cà Mau',
    'Rạch Giá',
  ],
  // Tây Nguyên
  highlands: ['Buôn Ma Thuột', 'Pleiku', 'Kon Tum', 'Gia Lai', 'Đắk Lắk'],
};

describe('Weather API Integration - Geocoding', () => {
  test('geocodeLocation - tìm Hà Nội', async () => {
    const result = await geocodeLocation('Hà Nội');

    expect(result).not.toBeNull();
    expect(result!.name).toContain('Hà Nội');
    expect(result!.country).toMatch(/Việt Nam|Vietnam/);
    expect(result!.latitude).toBeGreaterThan(20);
    expect(result!.latitude).toBeLessThan(22);
    expect(result!.longitude).toBeGreaterThan(105);
    expect(result!.longitude).toBeLessThan(106);
  }, TEST_CONFIG.timeout);

  test('geocodeLocation - tìm TP.HCM', async () => {
    const result = await geocodeLocation('Hồ Chí Minh');

    expect(result).not.toBeNull();
    expect(result!.latitude).toBeGreaterThan(10);
    expect(result!.latitude).toBeLessThan(11);
    expect(result!.longitude).toBeGreaterThan(106);
    expect(result!.longitude).toBeLessThan(107);
  }, TEST_CONFIG.timeout);

  test('geocodeLocation - tìm Đà Nẵng', async () => {
    const result = await geocodeLocation('Đà Nẵng');

    expect(result).not.toBeNull();
    expect(result!.latitude).toBeGreaterThan(15);
    expect(result!.latitude).toBeLessThan(17);
  }, TEST_CONFIG.timeout);

  test('geocodeLocation - địa điểm không tồn tại', async () => {
    const result = await geocodeLocation('XyzNotExist12345');
    expect(result).toBeNull();
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Current Weather', () => {
  test('getWeather - Hà Nội (thời tiết hiện tại)', async () => {
    const result = await getWeather({ location: 'Hà Nội', days: 1, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location.name).toContain('Hà Nội');
    expect(result.location.country).toMatch(/Việt Nam|Vietnam/);

    // Current weather
    expect(result.current).toBeDefined();
    expect(result.current.temperature).toBeGreaterThan(-10);
    expect(result.current.temperature).toBeLessThan(50);
    expect(result.current.humidity).toBeGreaterThanOrEqual(0);
    expect(result.current.humidity).toBeLessThanOrEqual(100);
    expect(result.current.weatherDescription).toBeDefined();
    expect(result.current.windSpeed).toBeGreaterThanOrEqual(0);
    expect(result.current.pressure).toBeGreaterThan(900);
    expect(result.current.pressure).toBeLessThan(1100);
  }, TEST_CONFIG.timeout);

  test('getWeather - TP.HCM (thời tiết hiện tại)', async () => {
    const result = await getWeather({ location: 'Hồ Chí Minh', days: 1, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.current.temperature).toBeGreaterThan(15); // TP.HCM thường nóng
    expect(result.current.temperature).toBeLessThan(45);
    expect(result.timezone).toContain('Asia');
  }, TEST_CONFIG.timeout);

  test('getWeather - Dalat (vùng cao nguyên)', async () => {
    const result = await getWeather({ location: 'Dalat', days: 1, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location.latitude).toBeGreaterThan(11);
    expect(result.location.latitude).toBeLessThan(12);
    // Đà Lạt thường mát hơn
    expect(result.current.temperature).toBeLessThan(35);
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Daily Forecast', () => {
  test('getWeather - dự báo 7 ngày', async () => {
    const result = await getWeather({ location: 'Hà Nội', days: 7, hourlyHours: 0 });

    expect(result.daily).toBeArray();
    expect(result.daily.length).toBe(7);

    const today = result.daily[0];
    expect(today.date).toBeDefined();
    expect(today.temperatureMax).toBeGreaterThanOrEqual(today.temperatureMin);
    expect(today.weatherDescription).toBeDefined();
    expect(today.sunrise).toBeDefined();
    expect(today.sunset).toBeDefined();
    expect(today.precipitationProbability).toBeGreaterThanOrEqual(0);
    expect(today.precipitationProbability).toBeLessThanOrEqual(100);
  }, TEST_CONFIG.timeout);

  test('getWeather - dự báo 14 ngày', async () => {
    const result = await getWeather({ location: 'Đà Nẵng', days: 14, hourlyHours: 0 });

    expect(result.daily.length).toBe(14);

    // Kiểm tra tất cả các ngày có dữ liệu hợp lệ
    for (const day of result.daily) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.temperatureMax).toBeGreaterThan(-20);
      expect(day.temperatureMin).toBeLessThan(50);
    }
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Hourly Forecast', () => {
  test('getWeather - dự báo theo giờ (24h)', async () => {
    const result = await getWeather({ location: 'Nha Trang', days: 1, hourlyHours: 24 });

    expect(result.hourly).toBeArray();
    expect(result.hourly.length).toBe(24);

    const firstHour = result.hourly[0];
    expect(firstHour.time).toBeDefined();
    expect(firstHour.temperature).toBeDefined();
    expect(firstHour.humidity).toBeGreaterThanOrEqual(0);
    expect(firstHour.humidity).toBeLessThanOrEqual(100);
    expect(firstHour.weatherDescription).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('getWeather - dự báo theo giờ (48h)', async () => {
    const result = await getWeather({ location: 'Huế', days: 2, hourlyHours: 48 });

    expect(result.hourly.length).toBe(48);
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Miền Bắc Việt Nam', () => {
  test.each(VIETNAM_LOCATIONS.north.slice(0, 5))('getWeather - %s', async (location) => {
    const result = await getWeather({ location, days: 3, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location).toBeDefined();
    expect(result.current).toBeDefined();
    expect(result.daily.length).toBeGreaterThanOrEqual(3);

    // Miền Bắc: vĩ độ từ 17-24 (bao gồm cả vùng giáp ranh)
    expect(result.location.latitude).toBeGreaterThan(17);
    expect(result.location.latitude).toBeLessThan(24);
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Miền Trung Việt Nam', () => {
  test.each(VIETNAM_LOCATIONS.central.slice(0, 5))('getWeather - %s', async (location) => {
    const result = await getWeather({ location, days: 3, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location).toBeDefined();
    expect(result.current).toBeDefined();

    // Miền Trung: vĩ độ từ 11-20
    expect(result.location.latitude).toBeGreaterThan(10);
    expect(result.location.latitude).toBeLessThan(21);
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Miền Nam Việt Nam', () => {
  test.each(VIETNAM_LOCATIONS.south.slice(0, 5))('getWeather - %s', async (location) => {
    const result = await getWeather({ location, days: 3, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location).toBeDefined();
    expect(result.current).toBeDefined();

    // Miền Nam: vĩ độ từ 8-12
    expect(result.location.latitude).toBeGreaterThan(7);
    expect(result.location.latitude).toBeLessThan(13);
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Tây Nguyên', () => {
  test.each(VIETNAM_LOCATIONS.highlands.slice(0, 3))('getWeather - %s', async (location) => {
    const result = await getWeather({ location, days: 3, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location).toBeDefined();
    expect(result.current).toBeDefined();

    // Tây Nguyên: vĩ độ từ 11-15
    expect(result.location.latitude).toBeGreaterThan(10);
    expect(result.location.latitude).toBeLessThan(16);
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Error Handling', () => {
  test('getWeather - địa điểm không tồn tại', async () => {
    await expect(getWeather({ location: 'XyzNotExist12345' })).rejects.toThrow(
      'Không tìm thấy địa điểm',
    );
  }, TEST_CONFIG.timeout);

  test('getWeather - tên địa điểm rỗng', async () => {
    await expect(getWeather({ location: '' })).rejects.toThrow();
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Weather Codes', () => {
  test('getWeather - weather description có giá trị', async () => {
    const result = await getWeather({ location: 'Hà Nội', days: 7, hourlyHours: 24 });

    // Kiểm tra current weather có description
    expect(result.current.weatherDescription).toBeDefined();
    expect(result.current.weatherDescription.length).toBeGreaterThan(0);

    // Kiểm tra daily forecast có description
    for (const day of result.daily) {
      expect(day.weatherDescription).toBeDefined();
      expect(day.weatherDescription.length).toBeGreaterThan(0);
    }

    // Kiểm tra hourly forecast có description
    for (const hour of result.hourly) {
      expect(hour.weatherDescription).toBeDefined();
      expect(hour.weatherDescription.length).toBeGreaterThan(0);
    }
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - Timezone', () => {
  test('getWeather - timezone Việt Nam', async () => {
    const result = await getWeather({ location: 'Hà Nội', days: 1, hourlyHours: 6 });

    expect(result.timezone).toContain('Asia');
    expect(result.timezoneAbbreviation).toBeDefined();
  }, TEST_CONFIG.timeout);
});

describe('Weather API Integration - International Locations', () => {
  test('getWeather - Tokyo, Japan', async () => {
    const result = await getWeather({ location: 'Tokyo', days: 3, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location.country).toMatch(/Japan|Nhật Bản/);
    expect(result.location.latitude).toBeGreaterThan(35);
    expect(result.location.latitude).toBeLessThan(36);
  }, TEST_CONFIG.timeout);

  test('getWeather - Seoul, Korea', async () => {
    const result = await getWeather({ location: 'Seoul', days: 3, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location.latitude).toBeGreaterThan(37);
    expect(result.location.latitude).toBeLessThan(38);
  }, TEST_CONFIG.timeout);

  test('getWeather - Singapore', async () => {
    const result = await getWeather({ location: 'Singapore', days: 3, hourlyHours: 6 });

    expect(result).toBeDefined();
    expect(result.location.latitude).toBeGreaterThan(1);
    expect(result.location.latitude).toBeLessThan(2);
  }, TEST_CONFIG.timeout);
});
