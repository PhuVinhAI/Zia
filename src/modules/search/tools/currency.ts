/**
 * Tool: currency - Đổi tiền và tra cứu tỷ giá
 * Sử dụng Exchange Rate API (miễn phí, không cần API key)
 */

import { debugLog } from '../../../core/logger/logger.js';
import {
  CurrencyConvertSchema,
  CurrencyRatesSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import {
  CURRENCY_NAMES,
  convertCurrency,
  formatCurrency,
  getExchangeRates,
  getVNDRates,
  POPULAR_CURRENCIES,
} from '../services/currencyClient.js';

/**
 * Tool: currencyConvert - Đổi tiền từ loại này sang loại khác
 */
export const currencyConvertTool: ToolDefinition = {
  name: 'currencyConvert',
  description:
    'Đổi tiền từ một loại tiền tệ sang loại khác. Hỗ trợ 150+ loại tiền tệ trên thế giới.',
  parameters: [
    { name: 'amount', type: 'number', description: 'Số tiền cần đổi', required: true },
    {
      name: 'from',
      type: 'string',
      description: 'Mã tiền tệ nguồn (VD: USD, VND, EUR)',
      required: true,
    },
    {
      name: 'to',
      type: 'string',
      description: 'Mã tiền tệ đích (VD: VND, USD, JPY)',
      required: true,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(CurrencyConvertSchema, params, 'currencyConvert');
    if (!validation.success) return { success: false, error: validation.error };
    const { amount, from, to } = validation.data;

    try {
      const result = await convertCurrency(amount, from, to);

      if (!result) {
        return {
          success: false,
          error: `Không thể đổi tiền từ ${from} sang ${to}. Kiểm tra mã tiền tệ.`,
        };
      }

      debugLog('CURRENCY', `Converted ${amount} ${from} to ${result.result} ${to}`);

      return {
        success: true,
        data: {
          from: {
            code: result.from,
            name: CURRENCY_NAMES[result.from] || result.from,
            amount: result.amount,
            formatted: formatCurrency(result.amount, result.from),
          },
          to: {
            code: result.to,
            name: CURRENCY_NAMES[result.to] || result.to,
            amount: result.result,
            formatted: formatCurrency(result.result, result.to),
          },
          rate: result.rate,
          rateText: `1 ${result.from} = ${result.rate.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} ${result.to}`,
          date: result.date,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi đổi tiền: ${error.message}` };
    }
  },
};

/**
 * Tool: currencyRates - Xem tỷ giá của nhiều loại tiền
 */
export const currencyRatesTool: ToolDefinition = {
  name: 'currencyRates',
  description: 'Xem tỷ giá của nhiều loại tiền tệ so với một loại tiền cơ sở (mặc định VND).',
  parameters: [
    {
      name: 'base',
      type: 'string',
      description: 'Mã tiền tệ cơ sở (mặc định VND)',
      required: false,
    },
    {
      name: 'currencies',
      type: 'string',
      description: 'Danh sách mã tiền cần xem, cách nhau bởi dấu phẩy (VD: USD,EUR,JPY)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(CurrencyRatesSchema, params, 'currencyRates');
    if (!validation.success) return { success: false, error: validation.error };
    const { base, currencies } = validation.data;

    try {
      // Parse currencies string to array
      const currencyList = currencies
        ? currencies.split(',').map((c) => c.trim().toUpperCase())
        : POPULAR_CURRENCIES;

      if (base.toUpperCase() === 'VND') {
        // Special case for VND base
        const vndRates = await getVNDRates(currencyList);
        if (!vndRates) {
          return { success: false, error: 'Không thể lấy tỷ giá VND' };
        }

        return {
          success: true,
          data: {
            base: 'VND',
            baseName: 'Việt Nam Đồng',
            date: vndRates.date,
            rates: vndRates.rates.map((r) => ({
              code: r.code,
              name: r.name,
              buy: formatCurrency(r.inverse, 'VND'), // 1 foreign = ? VND
              buyValue: Math.round(r.inverse),
            })),
          },
        };
      }

      // General case
      const rates = await getExchangeRates(base);
      if (!rates) {
        return { success: false, error: `Không thể lấy tỷ giá cho ${base}` };
      }

      const ratesList = currencyList
        .filter((code) => rates.rates[code] !== undefined)
        .map((code) => ({
          code,
          name: CURRENCY_NAMES[code] || code,
          rate: rates.rates[code],
          formatted: `1 ${base.toUpperCase()} = ${rates.rates[code].toLocaleString('vi-VN', { maximumFractionDigits: 4 })} ${code}`,
        }));

      debugLog('CURRENCY', `Got ${ratesList.length} rates for ${base}`);

      return {
        success: true,
        data: {
          base: rates.base,
          baseName: CURRENCY_NAMES[rates.base] || rates.base,
          date: rates.date,
          rates: ratesList,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy tỷ giá: ${error.message}` };
    }
  },
};
