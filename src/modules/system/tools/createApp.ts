/**
 * Tool: createApp - Tạo ứng dụng web tĩnh (HTML single-file)
 * Sử dụng Tailwind CSS CDN + các thư viện phổ biến
 */

import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import {
  type CreateAppParams,
  CreateAppSchema,
  validateParams,
} from '../../../shared/schemas/tools.schema.js';

// ═══════════════════════════════════════════════════
// CDN LIBRARIES - Full frameworks cho mọi nhu cầu
// ═══════════════════════════════════════════════════

const CDN: Record<string, string> = {
  // === CSS FRAMEWORKS ===
  tailwind: '<script src="https://cdn.tailwindcss.com"></script>',
  bootstrap: '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"><script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>',
  daisyui: '<script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet">',

  // === JS FRAMEWORKS ===
  alpine: '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>',
  petite: '<script src="https://unpkg.com/petite-vue"></script>',
  jquery: '<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>',

  // === 2D GAME ENGINES ===
  phaser: '<script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>',
  pixijs: '<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js"></script>',
  kaboom: '<script src="https://unpkg.com/kaboom@3000.1.17/dist/kaboom.js"></script>',
  kontra: '<script src="https://unpkg.com/kontra@9.0.0/kontra.min.js"></script>',
  excalibur: '<script src="https://cdn.jsdelivr.net/npm/excalibur@0.29.0/build/dist/excalibur.min.js"></script>',

  // === 3D ENGINES ===
  three: '<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>',
  babylon: '<script src="https://cdn.babylonjs.com/babylon.js"></script>',
  aframe: '<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>',
  playcanvas: '<script src="https://cdn.jsdelivr.net/npm/playcanvas@1.68.0/build/playcanvas.min.js"></script>',

  // === PHYSICS ===
  matter: '<script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>',
  p2: '<script src="https://cdn.jsdelivr.net/npm/p2-es@1.1.6/build/p2-es.min.js"></script>',
  cannon: '<script src="https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.min.js"></script>',

  // === ANIMATION ===
  anime: '<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>',
  gsap: '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.4/dist/gsap.min.js"></script>',
  motion: '<script src="https://cdn.jsdelivr.net/npm/motion@10.16.4/dist/motion.min.js"></script>',
  lottie: '<script src="https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js"></script>',
  confetti: '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>',
  particles: '<script src="https://cdn.jsdelivr.net/npm/tsparticles@2.12.0/tsparticles.bundle.min.js"></script>',

  // === CHARTS & DATA VIZ ===
  chartjs: '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>',
  apexcharts: '<script src="https://cdn.jsdelivr.net/npm/apexcharts@3.45.1/dist/apexcharts.min.js"></script>',
  echarts: '<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>',
  d3: '<script src="https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js"></script>',

  // === AUDIO ===
  howler: '<script src="https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js"></script>',
  tone: '<script src="https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.min.js"></script>',
  pizzicato: '<script src="https://cdn.jsdelivr.net/npm/pizzicato@0.6.4/distr/Pizzicato.min.js"></script>',

  // === UTILITIES ===
  lodash: '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>',
  dayjs: '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>',
  axios: '<script src="https://cdn.jsdelivr.net/npm/axios@1.6.2/dist/axios.min.js"></script>',
  localforage: '<script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>',
  uuid: '<script src="https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/umd/uuid.min.js"></script>',

  // === UI COMPONENTS ===
  sweetalert: '<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.10.1/dist/sweetalert2.all.min.js"></script>',
  toastify: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"><script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>',
  tippy: '<script src="https://unpkg.com/@popperjs/core@2"></script><script src="https://unpkg.com/tippy.js@6"></script>',
  sortable: '<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>',
  swiper: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"><script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>',

  // === MARKDOWN & CODE ===
  marked: '<script src="https://cdn.jsdelivr.net/npm/marked@11.1.0/marked.min.js"></script>',
  prism: '<link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet"><script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>',
  highlight: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css"><script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/highlight.min.js"></script>',
  katex: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>',

  // === ICONS ===
  fontawesome: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
  lucide: '<script src="https://unpkg.com/lucide@latest"></script>',
  boxicons: '<link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">',
  heroicons: '<script src="https://cdn.jsdelivr.net/npm/heroicons@2.1.1/24/outline/index.min.js"></script>',

  // === FORMS & VALIDATION ===
  imask: '<script src="https://cdn.jsdelivr.net/npm/imask@7.3.0/dist/imask.min.js"></script>',
  cleave: '<script src="https://cdn.jsdelivr.net/npm/cleave.js@1.6.0/dist/cleave.min.js"></script>',

  // === CANVAS & DRAWING ===
  fabric: '<script src="https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js"></script>',
  konva: '<script src="https://cdn.jsdelivr.net/npm/konva@9.2.3/konva.min.js"></script>',
  paper: '<script src="https://cdn.jsdelivr.net/npm/paper@0.12.17/dist/paper-full.min.js"></script>',
  rough: '<script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js"></script>',

  // === PDF & EXPORT ===
  html2canvas: '<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>',
  jspdf: '<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>',

  // === QR CODE ===
  qrcode: '<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>',
  qrcodejs: '<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>',
};

// Danh sách tất cả library keys
const LIBRARY_KEYS = Object.keys(CDN);


function buildHtmlFile(params: CreateAppParams): string {
  const { name, html, css, js, title, description, libraries } = params;
  const appTitle = title || name;

  // Build CDN includes - mặc định có tailwind
  const libs = libraries && libraries.length > 0 ? libraries : ['tailwind'];
  const libIncludes = libs
    .filter((lib) => lib in CDN)
    .map((lib) => CDN[lib])
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description || appTitle}">
  <title>${appTitle}</title>
  ${libIncludes}
  ${css ? `<style>${css}</style>` : ''}
</head>
<body>
${html}
${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
}

export const createAppTool: ToolDefinition = {
  name: 'createApp',
  description: `Tạo ứng dụng web/game tĩnh (HTML single-file) với CDN frameworks.
User tải về mở trên trình duyệt để sử dụng.

**LIBRARIES CÓ SẴN:**

🎨 CSS: tailwind (mặc định), bootstrap, daisyui
⚡ JS: alpine, petite, jquery

🎮 2D GAME: phaser, pixijs, kaboom, kontra, excalibur
🌐 3D GAME: three, babylon, aframe, playcanvas
⚙️ PHYSICS: matter, p2, cannon

✨ ANIMATION: anime, gsap, motion, lottie, confetti, particles
📊 CHARTS: chartjs, apexcharts, echarts, d3
🔊 AUDIO: howler, tone, pizzicato

🛠️ UTILS: lodash, dayjs, axios, localforage, uuid
💬 UI: sweetalert, toastify, tippy, sortable, swiper
📝 CODE: marked, prism, highlight, katex
🎯 ICONS: fontawesome, lucide, boxicons
🖼️ CANVAS: fabric, konva, paper, rough
📄 EXPORT: html2canvas, jspdf, qrcode

**VÍ DỤ:**
- Game 2D: libraries:["kaboom"] hoặc ["phaser"]
- Game 3D: libraries:["three"] hoặc ["babylon"]
- App UI: libraries:["tailwind","alpine","sweetalert"]
- Drawing: libraries:["tailwind","fabric"]`,
  parameters: [
    { name: 'name', type: 'string', description: 'Tên app', required: true },
    { name: 'html', type: 'string', description: 'HTML body content', required: true },
    { name: 'css', type: 'string', description: 'CSS bổ sung', required: false },
    { name: 'js', type: 'string', description: 'JavaScript code', required: false },
    { name: 'title', type: 'string', description: 'Tiêu đề tab', required: false },
    { name: 'description', type: 'string', description: 'Meta description', required: false },
    { name: 'libraries', type: 'object', description: 'Mảng thư viện CDN cần dùng', required: false },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    const validation = validateParams(CreateAppSchema, params);
    if (!validation.success) return { success: false, error: validation.error };

    try {
      const htmlContent = buildHtmlFile(validation.data);
      const buffer = Buffer.from(htmlContent, 'utf-8');
      const safeName = validation.data.name
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[<>:"/\\|?*]/g, '');
      const filename = `${safeName}.html`;

      return {
        success: true,
        data: {
          fileBuffer: buffer,
          filename,
          mimeType: 'text/html',
          fileSize: buffer.length,
          fileType: 'html',
          title: validation.data.title || validation.data.name,
          instructions: '📱 Tải file về → Mở bằng trình duyệt để sử dụng!',
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tạo app: ${error.message}` };
    }
  },
};
