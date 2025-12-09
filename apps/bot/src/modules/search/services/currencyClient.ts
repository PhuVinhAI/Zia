/**
 * Currency Exchange API Client
 * Sử dụng exchangerate-api.com (miễn phí, không cần API key)
 * Docs: https://www.exchangerate-api.com/docs/free
 */

import { debugLog } from '../../../core/logger/logger.js';
import { http } from '../../../shared/utils/httpClient.js';

const EXCHANGE_API = 'https://open.er-api.com/v6/latest';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
  date: string;
}

// ═══════════════════════════════════════════════════
// SUPPORTED CURRENCIES
// ═══════════════════════════════════════════════════

export const CURRENCY_NAMES: Record<string, string> = {
  // Major currencies
  USD: 'Đô la Mỹ',
  EUR: 'Euro',
  GBP: 'Bảng Anh',
  JPY: 'Yên Nhật',
  CNY: 'Nhân dân tệ',
  KRW: 'Won Hàn Quốc',
  // Southeast Asia
  VND: 'Việt Nam Đồng',
  THB: 'Baht Thái',
  SGD: 'Đô la Singapore',
  MYR: 'Ringgit Malaysia',
  IDR: 'Rupiah Indonesia',
  PHP: 'Peso Philippines',
  // Other Asian
  HKD: 'Đô la Hồng Kông',
  TWD: 'Đô la Đài Loan',
  INR: 'Rupee Ấn Độ',
  // Other major
  AUD: 'Đô la Úc',
  CAD: 'Đô la Canada',
  CHF: 'Franc Thụy Sĩ',
  NZD: 'Đô la New Zealand',
  RUB: 'Rúp Nga',
  // Crypto-related
  BTC: 'Bitcoin',
};

export const POPULAR_CURRENCIES = ['USD', 'EUR', 'VND', 'JPY', 'KRW', 'CNY', 'GBP', 'THB', 'SGD'];

// ═══════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Lấy tỷ giá từ một loại tiền tệ
 */
export async function getExchangeRates(baseCurrency = 'USD'): Promise<ExchangeRates | null> {
  try {
    debugLog('CURRENCY', `Fetching rates for ${baseCurrency}`);

    const response = await http.get(`${EXCHANGE_API}/${baseCurrency.toUpperCase()}`).json<{
      result: string;
      base_code: string;
      time_last_update_utc: string;
      rates: Record<string, number>;
    }>();

    if (response.result !== 'success') {
      debugLog('CURRENCY', `API error for ${baseCurrency}`);
      return null;
    }

    const date = new Date(response.time_last_update_utc).toISOString().split('T')[0];

    debugLog('CURRENCY', `✓ Got ${Object.keys(response.rates).length} rates for ${baseCurrency}`);

    return {
      base: response.base_code,
      date,
      rates: response.rates,
    };
  } catch (error: any) {
    debugLog('CURRENCY', `Error: ${error.message}`);
    return null;
  }
}

/**
 * Đổi tiền từ một loại sang loại khác
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<ConversionResult | null> {
  try {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    debugLog('CURRENCY', `Converting ${amount} ${fromUpper} to ${toUpper}`);

    const rates = await getExchangeRates(fromUpper);
    if (!rates) {
      return null;
    }

    const rate = rates.rates[toUpper];
    if (rate === undefined) {
      debugLog('CURRENCY', `Currency not found: ${toUpper}`);
      return null;
    }

    const result = amount * rate;

    debugLog('CURRENCY', `✓ ${amount} ${fromUpper} = ${result.toFixed(2)} ${toUpper}`);

    return {
      from: fromUpper,
      to: toUpper,
      amount,
      result,
      rate,
      date: rates.date,
    };
  } catch (error: any) {
    debugLog('CURRENCY', `Conversion error: ${error.message}`);
    return null;
  }
}

/**
 * Lấy tỷ giá của nhiều loại tiền so với VND
 */
export async function getVNDRates(currencies?: string[]): Promise<{
  date: string;
  rates: Array<{ code: string; name: string; rate: number; inverse: number }>;
} | null> {
  try {
    const rates = await getExchangeRates('VND');
    if (!rates) return null;

    const targetCurrencies = currencies || POPULAR_CURRENCIES;

    const result = targetCurrencies
      .filter((code) => rates.rates[code] !== undefined)
      .map((code) => ({
        code,
        name: CURRENCY_NAMES[code] || code,
        rate: rates.rates[code], // 1 VND = ? foreign
        inverse: 1 / rates.rates[code], // 1 foreign = ? VND
      }));

    return {
      date: rates.date,
      rates: result,
    };
  } catch (error: any) {
    debugLog('CURRENCY', `VND rates error: ${error.message}`);
    return null;
  }
}

/**
 * Format số tiền theo locale
 */
export function formatCurrency(amount: number, currency: string): string {
  const code = currency.toUpperCase();

  // Các loại tiền không có số thập phân
  const noDecimalCurrencies = ['VND', 'JPY', 'KRW', 'IDR'];

  const decimals = noDecimalCurrencies.includes(code) ? 0 : 2;

  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // Fallback nếu currency không hợp lệ
    return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: decimals })} ${code}`;
  }
}

/**
 * Lấy danh sách tất cả currencies được hỗ trợ
 */
export async function getSupportedCurrencies(): Promise<string[]> {
  const rates = await getExchangeRates('USD');
  if (!rates) return Object.keys(CURRENCY_NAMES);
  return Object.keys(rates.rates);
}
