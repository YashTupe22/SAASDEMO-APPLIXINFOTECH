/**
 * Returns today's date as YYYY-MM-DD in the user's LOCAL timezone.
 *
 * Why not new Date().toISOString().split('T')[0] ?
 * toISOString() always returns UTC — in India (IST = UTC+5:30) this shows
 * "yesterday" for any time between midnight IST and 5:30 AM IST, and
 * practically affects users working late (e.g. 10 PM IST → UTC is still
 * the previous day).
 */
export function localDate(): string {
  const d = new Date();
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  );
}
