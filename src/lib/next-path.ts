/**
 * ログイン後の戻り先（?next=）を安全に取り出す。
 * 外部サイトへのリダイレクト（//evil.example など）は既定値に落とす。
 */
export function safeNextPath(value: string | null | undefined, fallback = '/app'): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  // '//host' や '/\host' はブラウザが別ホストとして解釈するため拒否
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // 制御文字・改行はURLに混ぜない
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
