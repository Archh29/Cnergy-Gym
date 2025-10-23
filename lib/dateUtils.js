/**
 * Date utility functions for safe date handling
 */

/**
 * Safely format a date to ISO string (YYYY-MM-DD)
 * @param {string|Date|null|undefined} dateValue - The date value to format
 * @param {string} fallback - Fallback value if date is invalid (default: "")
 * @returns {string} Formatted date string or fallback
 */
export function formatDateToISO(dateValue, fallback = "") {
    if (!dateValue) return fallback;

    const date = new Date(dateValue);

    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date value: ${dateValue}`);
        return fallback;
    }

    try {
        return date.toISOString().split("T")[0];
    } catch (error) {
        console.error(`Error formatting date: ${dateValue}`, error);
        return fallback;
    }
}

/**
 * Check if a date is valid
 * @param {string|Date|null|undefined} dateValue - The date value to check
 * @returns {boolean} True if date is valid, false otherwise
 */
export function isValidDate(dateValue) {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    return !isNaN(date.getTime());
}

/**
 * Safely create a Date object
 * @param {string|Date|null|undefined} dateValue - The date value
 * @returns {Date|null} Date object or null if invalid
 */
export function safeDate(dateValue) {
    if (!dateValue) return null;

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
}

/**
 * Format a date to a localized string
 * @param {string|Date|null|undefined} dateValue - The date value to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string or 'N/A'
 */
export function formatDateLocalized(dateValue, locale = 'en-US', options = {}) {
    const date = safeDate(dateValue);

    if (!date) return 'N/A';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    try {
        return date.toLocaleDateString(locale, defaultOptions);
    } catch (error) {
        console.error(`Error formatting date: ${dateValue}`, error);
        return 'N/A';
    }
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * @returns {string} Current date in ISO format
 */
export function getCurrentDateISO() {
    return new Date().toISOString().split("T")[0];
}

/**
 * Add days to a date
 * @param {string|Date} dateValue - The base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string|null} New date in ISO format or null if invalid
 */
export function addDays(dateValue, days) {
    const date = safeDate(dateValue);

    if (!date) return null;

    date.setDate(date.getDate() + days);
    return formatDateToISO(date);
}

/**
 * Calculate days between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number|null} Number of days or null if invalid dates
 */
export function daysBetween(startDate, endDate) {
    const start = safeDate(startDate);
    const end = safeDate(endDate);

    if (!start || !end) return null;

    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

