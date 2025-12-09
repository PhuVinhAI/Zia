/**
 * Integration Test: Currency Exchange API (Public - No API Key Required)
 * Test các chức năng đổi tiền và tra cứu tỷ giá
 */

import { describe, test, expect } from 'bun:test';
import {
  convertCurrency,
  getExchangeRates,
  getVNDRates,
  formatCurrency,
  getSupportedCurrencies,
  CURRENCY_NAMES,
  POPULAR_CURRENCIES,
} from '../../../src/modules/system/services/currencyClient.js';
import { TEST_CONFIG } from '../setup.js';

describe('Currency API - Exchange Rates', () => {
  test('getExchangeRates - USD base', async () => {
    const rates = await getExchangeRates('USD');

    expect(rates).not.toBeNull();
    expect(rates!.base).toBe('USD');
    expect(rates!.date).toBeDefined();
    expect(rates!.rates).toBeDefined();
    expect(rates!.rates.VND).toBeGreaterThan(20000);
    expect(rates!.rates.EUR).toBeGreaterThan(0);
    expect(rates!.rates.JPY).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);

  test('getExchangeRates - VND base', async () => {
    const rates = await getExchangeRates('VND');

    expect(rates).not.toBeNull();
    expect(rates!.base).toBe('VND');
    expect(rates!.rates.USD).toBeLessThan(0.001);
    expect(rates!.rates.EUR).toBeLessThan(0.001);
  }, TEST_CONFIG.timeout);

  test('getExchangeRates - EUR base', async () => {
    const rates = await getExchangeRates('EUR');

    expect(rates).not.toBeNull();
    expect(rates!.base).toBe('EUR');
    expect(rates!.rates.USD).toBeGreaterThan(1);
  }, TEST_CONFIG.timeout);

  test('getExchangeRates - JPY base', async () => {
    const rates = await getExchangeRates('JPY');

    expect(rates).not.toBeNull();
    expect(rates!.base).toBe('JPY');
    expect(rates!.rates.VND).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);
});

describe('Currency API - Convert', () => {
  test('convertCurrency - USD to VND', async () => {
    const result = await convertCurrency(100, 'USD', 'VND');

    expect(result).not.toBeNull();
    expect(result!.from).toBe('USD');
    expect(result!.to).toBe('VND');
    expect(result!.amount).toBe(100);
    expect(result!.result).toBeGreaterThan(2000000);
    expect(result!.rate).toBeGreaterThan(20000);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - VND to USD', async () => {
    const result = await convertCurrency(1000000, 'VND', 'USD');

    expect(result).not.toBeNull();
    expect(result!.from).toBe('VND');
    expect(result!.to).toBe('USD');
    expect(result!.result).toBeGreaterThan(30);
    expect(result!.result).toBeLessThan(60);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - EUR to USD', async () => {
    const result = await convertCurrency(100, 'EUR', 'USD');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - JPY to VND', async () => {
    const result = await convertCurrency(10000, 'JPY', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(1000000);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - KRW to VND', async () => {
    const result = await convertCurrency(100000, 'KRW', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(1000000);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - lowercase currency codes', async () => {
    const result = await convertCurrency(100, 'usd', 'vnd');

    expect(result).not.toBeNull();
    expect(result!.from).toBe('USD');
    expect(result!.to).toBe('VND');
  }, TEST_CONFIG.timeout);

  test('convertCurrency - same currency', async () => {
    const result = await convertCurrency(100, 'USD', 'USD');

    expect(result).not.toBeNull();
    expect(result!.result).toBe(100);
    expect(result!.rate).toBe(1);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - small amount', async () => {
    const result = await convertCurrency(0.01, 'USD', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(200);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - large amount', async () => {
    const result = await convertCurrency(1000000, 'USD', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(20000000000);
  }, TEST_CONFIG.timeout);
});

describe('Currency API - VND Rates', () => {
  test('getVNDRates - default currencies', async () => {
    const result = await getVNDRates();

    expect(result).not.toBeNull();
    expect(result!.date).toBeDefined();
    expect(result!.rates).toBeArray();
    expect(result!.rates.length).toBeGreaterThan(0);

    const usdRate = result!.rates.find((r) => r.code === 'USD');
    expect(usdRate).toBeDefined();
    expect(usdRate!.inverse).toBeGreaterThan(20000);
  }, TEST_CONFIG.timeout);

  test('getVNDRates - specific currencies', async () => {
    const result = await getVNDRates(['USD', 'EUR', 'JPY']);

    expect(result).not.toBeNull();
    expect(result!.rates.length).toBe(3);

    const codes = result!.rates.map((r) => r.code);
    expect(codes).toContain('USD');
    expect(codes).toContain('EUR');
    expect(codes).toContain('JPY');
  }, TEST_CONFIG.timeout);
});

describe('Currency API - Format', () => {
  test('formatCurrency - VND', () => {
    const formatted = formatCurrency(1000000, 'VND');
    expect(formatted).toContain('1.000.000');
  });

  test('formatCurrency - USD', () => {
    const formatted = formatCurrency(1234.56, 'USD');
    expect(formatted).toContain('1.234');
  });

  test('formatCurrency - JPY (no decimals)', () => {
    const formatted = formatCurrency(1000, 'JPY');
    expect(formatted).toContain('1.000');
    expect(formatted).not.toContain(',00');
  });

  test('formatCurrency - EUR', () => {
    const formatted = formatCurrency(99.99, 'EUR');
    expect(formatted).toContain('99');
  });
});

describe('Currency API - Supported Currencies', () => {
  test('getSupportedCurrencies - returns array', async () => {
    const currencies = await getSupportedCurrencies();

    expect(currencies).toBeArray();
    expect(currencies.length).toBeGreaterThan(100);
    expect(currencies).toContain('USD');
    expect(currencies).toContain('VND');
    expect(currencies).toContain('EUR');
  }, TEST_CONFIG.timeout);

  test('CURRENCY_NAMES - has common currencies', () => {
    expect(CURRENCY_NAMES.USD).toBe('Đô la Mỹ');
    expect(CURRENCY_NAMES.VND).toBe('Việt Nam Đồng');
    expect(CURRENCY_NAMES.EUR).toBe('Euro');
    expect(CURRENCY_NAMES.JPY).toBe('Yên Nhật');
    expect(CURRENCY_NAMES.KRW).toBe('Won Hàn Quốc');
  });

  test('POPULAR_CURRENCIES - has VND and USD', () => {
    expect(POPULAR_CURRENCIES).toContain('USD');
    expect(POPULAR_CURRENCIES).toContain('VND');
    expect(POPULAR_CURRENCIES).toContain('EUR');
  });
});

describe('Currency API - Southeast Asian Currencies', () => {
  test('convertCurrency - THB to VND', async () => {
    const result = await convertCurrency(1000, 'THB', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(500000);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - SGD to VND', async () => {
    const result = await convertCurrency(100, 'SGD', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(1500000);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - MYR to VND', async () => {
    const result = await convertCurrency(100, 'MYR', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(400000);
  }, TEST_CONFIG.timeout);

  test('convertCurrency - IDR to VND', async () => {
    const result = await convertCurrency(1000000, 'IDR', 'VND');

    expect(result).not.toBeNull();
    expect(result!.result).toBeGreaterThan(1000000);
  }, TEST_CONFIG.timeout);
});

describe('Currency API - Error Handling', () => {
  test('getExchangeRates - invalid currency', async () => {
    const rates = await getExchangeRates('INVALID');
    expect(rates).toBeNull();
  }, TEST_CONFIG.timeout);

  test('convertCurrency - invalid from currency', async () => {
    const result = await convertCurrency(100, 'INVALID', 'VND');
    expect(result).toBeNull();
  }, TEST_CONFIG.timeout);

  test('convertCurrency - invalid to currency', async () => {
    const result = await convertCurrency(100, 'USD', 'INVALID');
    expect(result).toBeNull();
  }, TEST_CONFIG.timeout);
});
