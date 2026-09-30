import { PlatformSettings, Product } from '../types';

const ROUND_ROBIN_KEY = 'ataq_rr_support_index_v2';
export const DEFAULT_REAL_SUPPORT_PHONE = '967733388353';

/**
 * Checks whether a phone number is an artificial dummy placeholder (e.g. 967770000001, 770000001).
 */
export function isDummyPhone(phone?: string | null): boolean {
  if (!phone || typeof phone !== 'string') return true;
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits || digits.length < 6) return true;
  // Matches 967770000000 - 967770000009 and 770000000 - 770000009
  if (/^(967)?77000000\d$/.test(digits)) return true;
  if (/^(967)?7700000\d{2}$/.test(digits)) return true;
  return false;
}

/**
 * Sanitizes and formats phone numbers specifically for Yemen WhatsApp URLs (https://wa.me/967...).
 * - Removes spaces, +, dashes, brackets, etc.
 * - Discards fake/dummy numbers and falls back to real customer support.
 * - Automatically prepends Yemen country code (967) if missing (e.g. 733388353 -> 967733388353).
 * - Strips redundant local prefix 0 (e.g. 0733388353 -> 967733388353).
 */
export function sanitizeWhatsAppPhone(
  rawPhone?: string | null,
  fallback = DEFAULT_REAL_SUPPORT_PHONE
): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return fallback;
  }

  let digits = rawPhone.replace(/[^0-9]/g, '');

  if (!digits || isDummyPhone(digits)) {
    return fallback;
  }

  // Remove leading 00 (international format)
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // If already starts with Yemen country code (967)
  if (digits.startsWith('967')) {
    if (digits.startsWith('9670')) {
      digits = '967' + digits.substring(4);
    }
    return digits;
  }

  // If starts with domestic trunk 0 (e.g. 0733388353)
  if (digits.startsWith('0') && digits.length === 10) {
    digits = digits.substring(1);
  }

  // 9-digit standard Yemen mobile number (73..., 77..., 78..., 71..., 70...)
  if (digits.length === 9) {
    return '967' + digits;
  }

  // 7 or 8 digits entered without country code
  if (digits.length >= 7 && digits.length <= 9) {
    return '967' + digits;
  }

  return digits;
}

/**
 * Gets the next support WhatsApp number using round-robin rotation.
 * Rotates evenly across all registered support numbers on every order click.
 * Strictly filters out dummy test numbers and guarantees valid 967 format.
 */
export function getNextSupportPhone(settings?: PlatformSettings): string {
  const fallback = DEFAULT_REAL_SUPPORT_PHONE;
  if (!settings) return fallback;

  // Filter out any dummy phones, sanitize, and remove empty entries
  const list = (settings.supportPhoneNumbers || [])
    .filter((num) => num && !isDummyPhone(num))
    .map((num) => sanitizeWhatsAppPhone(num, ''))
    .filter((num) => num && !isDummyPhone(num) && num.length >= 9);

  if (list.length === 0) {
    const mainPhone = settings.supportPhone;
    if (mainPhone && !isDummyPhone(mainPhone)) {
      return sanitizeWhatsAppPhone(mainPhone, fallback);
    }
    return fallback;
  }

  let currentIndex = 0;
  try {
    const saved = localStorage.getItem(ROUND_ROBIN_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        currentIndex = parsed;
      }
    }
  } catch {
    currentIndex = 0;
  }

  const selectedNumber = list[currentIndex % list.length];
  const nextIndex = (currentIndex + 1) % list.length;

  try {
    localStorage.setItem(ROUND_ROBIN_KEY, nextIndex.toString());
  } catch {
    // Ignore localStorage write error
  }

  return selectedNumber;
}

/**
 * Resolves the phone number to be used for ordering a product.
 * Prefers the store/delegate's specific real phone if available and non-dummy;
 * otherwise automatically delegates to the live round-robin customer service list or platform support.
 */
export function resolveProductOrderPhone(
  product?: Product | null,
  settings?: PlatformSettings
): string {
  if (product && product.merchantPhone && !isDummyPhone(product.merchantPhone)) {
    return sanitizeWhatsAppPhone(product.merchantPhone);
  }
  return getNextSupportPhone(settings);
}

/**
 * Calculates selling price for customers based on cost price and store profit margin percentage.
 * Explicitly supports 0% profit margin:
 * When margin is 0%, Customer Price = Merchant Price exactly (no default or automatic markup).
 */
export function calculateCustomerPrice(costPrice: number, marginPercent?: number | null): number {
  if (!costPrice || costPrice < 0) return 0;
  // If margin is 0 or undefined, do NOT apply 20% fallback. 0% means 0% margin.
  const margin = typeof marginPercent === 'number' && !isNaN(marginPercent)
    ? Math.max(0, marginPercent)
    : 0;
  return Math.round(costPrice + (costPrice * (margin / 100)));
}

/**
 * Determines the customer selling price for a product.
 * Reads the static snapshot price saved directly inside the product document.
 * Strictly prevents retroactive modifications: changes to platform profit margin settings
 * will NEVER alter previously published products.
 * If published with 0% margin, Customer Price = Merchant Cost Price, fixed permanently.
 */
export function getProductCustomerPrice(
  product: Product,
  _platformMarginPercent?: number | null
): number {
  if (!product) return 0;

  // 1. Explicit static snapshot customerPrice
  if (typeof product.customerPrice === 'number' && product.customerPrice > 0) {
    return product.customerPrice;
  }

  // 2. Saved discountPrice snapshot
  if (typeof product.discountPrice === 'number' && product.discountPrice > 0) {
    return product.discountPrice;
  }

  // 3. Saved originalPrice snapshot
  if (typeof product.originalPrice === 'number' && product.originalPrice > 0) {
    return product.originalPrice;
  }

  // 4. Fallback to costPrice if available (0% margin fallback)
  if (typeof product.costPrice === 'number' && product.costPrice > 0) {
    return product.costPrice;
  }

  return 0;
}

/**
 * Determines the original strike-through price for display.
 * When margin was 0% at publication (or if customerPrice equals costPrice),
 * avoids showing fake discounts or markups.
 */
export function getProductOriginalPrice(
  product: Product,
  _platformMarginPercent?: number | null
): number {
  if (!product) return 0;
  const currentPrice = getProductCustomerPrice(product);

  // If margin was 0% at publication or customerPrice equals cost, no strike-through fake markup
  if (product.appliedMarginPercent === 0) {
    return currentPrice;
  }

  if (
    typeof product.costPrice === 'number' &&
    product.costPrice > 0 &&
    product.costPrice === currentPrice
  ) {
    return currentPrice;
  }

  if (
    typeof product.originalPrice === 'number' &&
    product.originalPrice > currentPrice
  ) {
    return product.originalPrice;
  }

  return currentPrice;
}

