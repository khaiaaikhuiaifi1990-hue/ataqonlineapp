import { PlatformSettings } from '../types';

const ROUND_ROBIN_KEY = 'ataq_rr_support_index_v2';

/**
 * Gets the next support WhatsApp number using round-robin rotation.
 * Rotates evenly across all registered support numbers on every order click.
 */
export function getNextSupportPhone(settings?: PlatformSettings): string {
  const fallback = '967770000000';
  if (!settings) return fallback;

  const list = (settings.supportPhoneNumbers || [])
    .map((num) => num.replace(/[^0-9]/g, ''))
    .filter((num) => num.length >= 6);

  if (list.length === 0) {
    return (settings.supportPhone || fallback).replace(/[^0-9]/g, '');
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
 * Calculates selling price for customers based on cost price and store profit margin percentage.
 */
export function calculateCustomerPrice(costPrice: number, marginPercent: number): number {
  if (!costPrice || costPrice < 0) return 0;
  const margin = Math.max(0, marginPercent || 0);
  return Math.round(costPrice + (costPrice * (margin / 100)));
}
