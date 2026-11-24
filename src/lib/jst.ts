/** 日本時間（Asia/Tokyo）の日付ユーティリティ。サーバー・クライアントどちらでも使える。 */

/** 日本時間（Asia/Tokyo）のYYYY-MM-DD */
export function jstToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
