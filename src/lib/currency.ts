/**
 * Currency detection and formatting utilities
 */

// List of EU countries that use EUR
const EU_COUNTRIES = [
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 
  'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
];

/**
 * Detect user's preferred currency based on browser settings
 * Returns 'eur' for EU countries, 'usd' otherwise
 */
export function detectUserCurrency(): 'usd' | 'eur' {
  try {
    // Try to get user's locale from browser
    const locale = navigator.language || 'en-US';
    
    // Extract country code (e.g., 'en-GB' -> 'GB', 'fr' -> 'FR')
    let countryCode = locale.split('-')[1]?.toUpperCase();
    
    // If no country code, use language code as fallback (e.g., 'fr' -> 'FR')
    if (!countryCode && locale.length === 2) {
      countryCode = locale.toUpperCase();
    }
    
    // Check if country uses EUR
    if (countryCode && EU_COUNTRIES.includes(countryCode)) {
      return 'eur';
    }
  } catch (error) {
    console.warn('Failed to detect currency, defaulting to USD:', error);
  }
  
  return 'usd';
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
