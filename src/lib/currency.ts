const peso = (() => {
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return null;
  }
})();

/** Formats a number as Philippine Peso, e.g. 1234.5 -> "₱1,234.50". */
export function formatPeso(amount: number): string {
  if (peso) return peso.format(amount);
  const fixed = Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}₱${fixed}`;
}

/** Parses user input like "1,234.50" or "₱ 1234" into a number, or null if invalid. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₱,\s]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
