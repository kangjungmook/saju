import { getJSON, setJSON } from './storage';

const LAST_OPENED_KEY = 'notif:lastOpenedDate';

/**
 * 03's bell needs an unread dot, but 알림함's feed is derived, not stored —
 * its lead item is today's score line, rebuilt each day (see app/notifications.tsx).
 * So "unread" is exactly "today's item exists and you haven't opened 알림함
 * since it appeared", which one date comparison answers without keeping a
 * parallel copy of the feed on this screen.
 */
export async function hasUnreadNotifications(todayISODate: string): Promise<boolean> {
  const lastOpened = await getJSON<string>(LAST_OPENED_KEY);
  return lastOpened !== todayISODate;
}

export async function markNotificationsOpened(todayISODate: string): Promise<void> {
  await setJSON(LAST_OPENED_KEY, todayISODate);
}
