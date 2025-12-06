import fs from 'node:fs';
import * as zcajs from 'zca-js';
import { debugLog, logError, logStep } from '../../core/logger/logger.js';
import { CONFIG } from '../../shared/constants/config.js';

export const { Zalo, ThreadType, Reactions, TextStyle } = zcajs as any;

const CREDENTIALS_PATH = './credentials.json';

export const zalo = new Zalo({
  selfListen: CONFIG.selfListen,
  logging: CONFIG.logging,
});

debugLog(
  'ZALO',
  `Zalo instance created: selfListen=${CONFIG.selfListen}, logging=${CONFIG.logging}`,
);

/**
 * Lưu credentials sau khi đăng nhập thành công
 * Hỗ trợ cả file và environment variable
 */
function saveCredentials(api: any): void {
  try {
    const ctx = api.getContext();
    const credentialsJson = JSON.stringify(ctx, null, 2);
    
    // Lưu vào file
    fs.writeFileSync(CREDENTIALS_PATH, credentialsJson);
    console.log(`💾 Đã lưu phiên đăng nhập vào ${CREDENTIALS_PATH}`);
    debugLog('ZALO', `Credentials saved to ${CREDENTIALS_PATH}`);
    
    // Log base64 để user có thể copy vào env var (cho cloud deployment)
    const base64 = Buffer.from(JSON.stringify(ctx)).toString('base64');
    console.log(`\n📋 Để deploy lên cloud, thêm env var:`);
    console.log(`ZALO_CREDENTIALS_BASE64=${base64}\n`);
  } catch (e) {
    console.error('⚠️ Không thể lưu credentials:', e);
    logError('saveCredentials', e);
  }
}

/**
 * Load credentials từ env var hoặc file
 * Ưu tiên: ZALO_CREDENTIALS_BASE64 > ZALO_CREDENTIALS_JSON > credentials.json file
 */
function loadCredentials(): any | null {
  // 1. Thử đọc từ env var (base64 encoded)
  const base64Creds = Bun.env.ZALO_CREDENTIALS_BASE64;
  if (base64Creds) {
    try {
      const json = Buffer.from(base64Creds, 'base64').toString('utf-8');
      debugLog('ZALO', 'Loaded credentials from ZALO_CREDENTIALS_BASE64 env var');
      console.log('🔑 Đọc credentials từ environment variable (base64)');
      return JSON.parse(json);
    } catch (e) {
      console.error('⚠️ Không thể parse ZALO_CREDENTIALS_BASE64:', e);
      logError('loadCredentials', e);
    }
  }

  // 2. Thử đọc từ env var (JSON string)
  const jsonCreds = Bun.env.ZALO_CREDENTIALS_JSON;
  if (jsonCreds) {
    try {
      debugLog('ZALO', 'Loaded credentials from ZALO_CREDENTIALS_JSON env var');
      console.log('🔑 Đọc credentials từ environment variable (JSON)');
      return JSON.parse(jsonCreds);
    } catch (e) {
      console.error('⚠️ Không thể parse ZALO_CREDENTIALS_JSON:', e);
      logError('loadCredentials', e);
    }
  }

  // 3. Fallback: đọc từ file
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const data = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
      debugLog('ZALO', `Loaded credentials from ${CREDENTIALS_PATH}`);
      return JSON.parse(data);
    }
    debugLog('ZALO', `No credentials file found at ${CREDENTIALS_PATH}`);
  } catch (e) {
    console.error('⚠️ Không thể đọc credentials:', e);
    logError('loadCredentials', e);
  }
  return null;
}

/**
 * Đăng nhập với credentials đã lưu hoặc QR code
 */
export async function loginWithQR(qrPath: string = './qr.png') {
  console.log('🚀 Đang khởi động Bot...');
  logStep('loginWithQR', { qrPath });

  let api: any;

  // Thử đăng nhập bằng credentials đã lưu
  const savedCredentials = loadCredentials();
  if (savedCredentials) {
    console.log('🔑 Tìm thấy phiên đăng nhập cũ, đang kết nối lại...');
    logStep('login', 'Using saved credentials');
    try {
      api = await zalo.login(savedCredentials);
      console.log('✅ Kết nối lại thành công!');
      debugLog('ZALO', 'Login with saved credentials successful');
    } catch (e) {
      console.log('⚠️ Phiên cũ hết hạn, cần quét QR mới...');
      logError('login', e);
      // Xóa credentials cũ
      if (fs.existsSync(CREDENTIALS_PATH)) {
        fs.unlinkSync(CREDENTIALS_PATH);
        debugLog('ZALO', 'Deleted expired credentials');
      }
      logStep('login', 'Requesting QR code');
      api = await zalo.loginQR({ qrPath });
      saveCredentials(api);
    }
  } else {
    // Đăng nhập bằng QR
    console.log('📱 Quét mã QR để đăng nhập...');
    logStep('login', 'No saved credentials, requesting QR code');
    api = await zalo.loginQR({ qrPath });
    saveCredentials(api);
  }

  const ctx = api.getContext();
  const myId = ctx.uid;
  const userName = ctx?.loginInfo?.name || 'Unknown';

  console.log(`✅ Đăng nhập thành công!`);
  console.log(`👤 Tên: ${userName}`);
  console.log(`🆔 ID: ${myId}`);

  // Lưu base64 credentials ra file để dễ copy cho cloud deployment
  const base64 = Buffer.from(JSON.stringify(ctx)).toString('base64');
  fs.writeFileSync('./credentials.base64.txt', base64);
  console.log(`📋 Đã lưu ZALO_CREDENTIALS_BASE64 vào ./credentials.base64.txt`);

  debugLog('ZALO', `Login successful: name=${userName}, uid=${myId}`);
  logStep('loginComplete', { userName, myId });

  return { api, myId };
}
