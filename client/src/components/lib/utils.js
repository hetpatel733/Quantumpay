import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// Utility function to merge class names with Tailwind
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
// Utility function to format a number with currency
export function formatCurrency(amount, currency = "USD", options) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        ...options,
    }).format(amount);
}
// Utility function to generate a unique ID
export function generateUniqueId(prefix = "id") {
    return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}
// Utility function to truncate text
export function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength) + "...";
}
// Utility function to format date
export function formatDate(date, options) {
    return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options,
    }).format(date);
}
// Enhanced debounce with immediate option
export function debounce(func, wait, immediate = false) {
    let timeout = null;
    return function (...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        
        const callNow = immediate && !timeout;
        
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(later, wait);
        
        if (callNow) func(...args);
    };
}
// Enhanced throttle with trailing option
export function throttle(func, limit, trailing = true) {
    let inThrottle = false;
    let lastArgs = null;
    
    return function (...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
                if (trailing && lastArgs) {
                    func(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        } else if (trailing) {
            lastArgs = args;
        }
    };
}
// Request deduplication utility
const pendingRequests = new Map();

export function dedupeRequest(key, requestFunction) {
    if (pendingRequests.has(key)) {
        console.log('🔄 Deduping request:', key);
        return pendingRequests.get(key);
    }
    
    const promise = requestFunction().finally(() => {
        pendingRequests.delete(key);
    });
    
    pendingRequests.set(key, promise);
    return promise;
}
// Batch requests utility
export function batchRequests(requests, batchSize = 3) {
    const batches = [];
    for (let i = 0; i < requests.length; i += batchSize) {
        batches.push(requests.slice(i, i + batchSize));
    }
    
    return batches.reduce(async (previousBatch, currentBatch) => {
        await previousBatch;
        return Promise.all(currentBatch.map(request => request()));
    }, Promise.resolve());
}
// Visibility API utility
export function onlyWhenVisible(callback) {
    return function(...args) {
        if (!document.hidden) {
            return callback(...args);
        }
        console.log('🚫 Skipping API call - tab not visible');
        return Promise.resolve();
    };
}
