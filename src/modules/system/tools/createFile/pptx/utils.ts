/**
 * PPTX Utils - Helper functions
 */

/**
 * Ensure color is 6-digit hex (PptxGenJS doesn't support alpha channel)
 * Converts colors like "0066CC40" to "0066CC"
 */
export function safeColor(color: string): string {
  // Remove # if present
  const c = color.replace('#', '');
  // Return only first 6 characters (remove alpha if present)
  return c.substring(0, 6);
}

/**
 * Create a lighter version of a color (for backgrounds, etc.)
 * Instead of using alpha, we blend with white
 */
export function lightenColor(hex: string, percent: number = 50): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);

  const newR = Math.round(r + (255 - r) * (percent / 100));
  const newG = Math.round(g + (255 - g) * (percent / 100));
  const newB = Math.round(b + (255 - b) * (percent / 100));

  return (
    newR.toString(16).padStart(2, '0') +
    newG.toString(16).padStart(2, '0') +
    newB.toString(16).padStart(2, '0')
  ).toUpperCase();
}

/**
 * Create a darker version of a color
 */
export function darkenColor(hex: string, percent: number = 20): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);

  const newR = Math.round(r * (1 - percent / 100));
  const newG = Math.round(g * (1 - percent / 100));
  const newB = Math.round(b * (1 - percent / 100));

  return (
    newR.toString(16).padStart(2, '0') +
    newG.toString(16).padStart(2, '0') +
    newB.toString(16).padStart(2, '0')
  ).toUpperCase();
}

/**
 * Get a border color (lighter version of primary)
 */
export function getBorderColor(primaryColor: string): string {
  return lightenColor(primaryColor, 60);
}
