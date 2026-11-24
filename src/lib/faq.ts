/**
 * トップページのよくある質問（日本語 / 英語）。
 * 画面表示とFAQPage構造化データ（JSON-LD）が食い違わないよう、同じ配列から描画する。
 */
import { messages } from './messages';
import type { Lang } from './i18n';

export type FaqItem = {
  question: string;
  answer: string;
};

export function faqItems(lang: Lang): FaqItem[] {
  return messages[lang].faq;
}

/** 既存の呼び出し向け（日本語） */
export const FAQ_ITEMS: FaqItem[] = messages.ja.faq;
