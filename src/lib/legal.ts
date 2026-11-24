/**
 * 法務ページの事業者情報。環境変数で差し替えられる（SETUP.md参照）。
 * 未設定の項目は特商法の「請求があった場合に開示」方式で表示する。
 * 英語ページ用に英訳した事業者情報も併せて持つ。
 */

import type { Lang } from './i18n';

function env(key: string, fallback = ''): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

/** URL・ロゴ用の日本語サービス名（短い方） */
const serviceNameJa = env('NEXT_PUBLIC_SERVICE_NAME', 'ベストショット抽出ツール');
const serviceNameEn = env('NEXT_PUBLIC_SERVICE_NAME_EN', 'Best Shot Extractor');
const operatorNameJa = env('NEXT_PUBLIC_OPERATOR_NAME', '大西 康文');
const operatorNameEn = env('NEXT_PUBLIC_OPERATOR_NAME_EN', 'Yasufumi Onishi');
const representativeJa = env('NEXT_PUBLIC_OPERATOR_REPRESENTATIVE', '大西 康文');
const representativeEn = env('NEXT_PUBLIC_OPERATOR_REPRESENTATIVE_EN', 'Yasufumi Onishi');

export const legal = {
  serviceName: serviceNameJa,
  operatorName: operatorNameJa,
  representative: representativeJa,
  address: env('NEXT_PUBLIC_OPERATOR_ADDRESS', ''),
  phone: env('NEXT_PUBLIC_OPERATOR_PHONE', ''),
  email: env('NEXT_PUBLIC_SUPPORT_EMAIL', 'yasu78951@gmail.com'),
  priceLabel: env('NEXT_PUBLIC_PRICE_LABEL', '月額500円（税込）'),
  effectiveDate: env('NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE', '2026年11月24日'),
  disclosureOnRequest: '請求があった場合に遅滞なく開示いたします',
};

export const legalEn = {
  serviceName: serviceNameEn,
  operatorName: operatorNameEn,
  representative: representativeEn,
  address: env('NEXT_PUBLIC_OPERATOR_ADDRESS_EN', ''),
  phone: env('NEXT_PUBLIC_OPERATOR_PHONE_EN', ''),
  email: legal.email,
  priceLabel: env('NEXT_PUBLIC_PRICE_LABEL_EN', '$4.99 per month'),
  effectiveDate: env('NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE_EN', 'November 24, 2026'),
  disclosureOnRequest: 'Disclosed without delay upon request.',
};

export const addressDisplay = legal.address || legal.disclosureOnRequest;
export const phoneDisplay = legal.phone || legal.disclosureOnRequest;

/** 表示言語に応じた事業者情報 */
export function legalFor(lang: Lang) {
  return lang === 'en' ? legalEn : legal;
}

export function addressDisplayFor(lang: Lang): string {
  const info = legalFor(lang);
  return info.address || info.disclosureOnRequest;
}

export function phoneDisplayFor(lang: Lang): string {
  const info = legalFor(lang);
  return info.phone || info.disclosureOnRequest;
}
