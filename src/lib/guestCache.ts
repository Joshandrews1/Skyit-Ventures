import { Order } from '../types';

/**
 * Generates or retrieves a persistent guest user ID stored in localStorage.
 * Ensures the ID starts with 'guest-uid-' as required by Firestore Security Rules.
 */
export function getOrCreateGuestUid(): string {
  if (typeof window === 'undefined') return 'guest-uid-server';
  let guestUid = localStorage.getItem('skyit_guest_uid');
  if (!guestUid || !guestUid.startsWith('guest-uid-')) {
    guestUid = 'guest-uid-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('skyit_guest_uid', guestUid);
  }
  return guestUid;
}

/**
 * Adds an order ID to the guest user's cached order list.
 */
export function cacheGuestOrderId(orderId: string) {
  if (typeof window === 'undefined') return;
  try {
    const cachedStr = localStorage.getItem('skyit_guest_order_ids');
    const cachedIds: string[] = cachedStr ? JSON.parse(cachedStr) : [];
    if (!cachedIds.includes(orderId)) {
      cachedIds.push(orderId);
      localStorage.setItem('skyit_guest_order_ids', JSON.stringify(cachedIds));
    }
  } catch (err) {
    console.error("Failed to cache guest order ID:", err);
  }
}

/**
 * Caches the complete order details in localStorage for instantaneous loading
 * and persistence across device sessions.
 */
export function cacheOrderDetails(order: Order) {
  if (typeof window === 'undefined') return;
  try {
    const cachedStr = localStorage.getItem('skyit_cached_orders');
    const cachedOrders: Record<string, Order> = cachedStr ? JSON.parse(cachedStr) : {};
    cachedOrders[order.id] = order;
    localStorage.setItem('skyit_cached_orders', JSON.stringify(cachedOrders));
    
    // Maintain both the order data and the tracking ID list
    cacheGuestOrderId(order.id);
  } catch (err) {
    console.error("Failed to cache order details:", err);
  }
}

/**
 * Retrieves all cached orders, sorted by creation date (newest first).
 */
export function getCachedOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const cachedStr = localStorage.getItem('skyit_cached_orders');
    if (!cachedStr) return [];
    const cachedOrders: Record<string, Order> = JSON.parse(cachedStr);
    return Object.values(cachedOrders).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error("Failed to retrieve cached orders:", err);
    return [];
  }
}

/**
 * Retrieves the array of guest order IDs currently stored in local storage.
 */
export function getCachedOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const cachedStr = localStorage.getItem('skyit_guest_order_ids');
    return cachedStr ? JSON.parse(cachedStr) : [];
  } catch (err) {
    return [];
  }
}
