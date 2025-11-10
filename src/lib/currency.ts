/**
 * Currency detection and formatting utilities
 */

/**
 * Detect user's preferred currency based on IP geolocation
 * Returns 'eur' for EU countries, 'usd' otherwise
 */
export async function detectUserCurrency(): Promise<'usd' | 'eur'> {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/detect-currency`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('Failed to detect currency from IP, defaulting to USD');
      return 'usd';
    }
    
    const data = await response.json();
    console.log('Detected currency from IP:', data.currency, 'Country:', data.country, 'IP:', data.ip);
    
    return data.currency as 'usd' | 'eur';
  } catch (error) {
    console.warn('Error detecting currency from IP, defaulting to USD:', error);
    return 'usd';
  }
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const symbol = currency.toLowerCase() === 'eur' ? '€' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    usd: '$',
    eur: '€',
  };
  return symbols[currency.toLowerCase()] || currency.toUpperCase();
}
