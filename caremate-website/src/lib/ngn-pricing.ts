/** Naira display helpers for org plan marketing prices. */

export function formatNgn(naira: number): string {
  return `₦${naira.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

/** Yearly total with a percentage discount off 12× monthly (default 10%). */
export function yearlyFromMonthly(monthlyNaira: number, discountPercent = 10): number {
  return Math.round(monthlyNaira * 12 * (1 - discountPercent / 100));
}

export function orgPlanFallbackPrices(monthlyNaira: number): {
  monthlyDisplay: string;
  yearlyDisplay: string;
} {
  return {
    monthlyDisplay: formatNgn(monthlyNaira),
    yearlyDisplay: formatNgn(yearlyFromMonthly(monthlyNaira)),
  };
}
