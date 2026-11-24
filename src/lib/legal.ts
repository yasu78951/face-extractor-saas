/**
 * 法務ページの事業者情報。環境変数で差し替えられる（SETUP.md参照）。
 * 未設定の項目は特商法の「請求があった場合に開示」方式で表示する。
 */

function env(key: string, fallback = ''): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

export const legal = {
  serviceName: env('NEXT_PUBLIC_SERVICE_NAME', 'ベストショット抽出ツール'),
  operatorName: env('NEXT_PUBLIC_OPERATOR_NAME', '大西 康文'),
  representative: env('NEXT_PUBLIC_OPERATOR_REPRESENTATIVE', '大西 康文'),
  address: env('NEXT_PUBLIC_OPERATOR_ADDRESS', ''),
  phone: env('NEXT_PUBLIC_OPERATOR_PHONE', ''),
  email: env('NEXT_PUBLIC_SUPPORT_EMAIL', 'yasu78951@gmail.com'),
  priceLabel: env('NEXT_PUBLIC_PRICE_LABEL', '月額500円（税込）'),
  effectiveDate: env('NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE', '2026年11月24日'),
  disclosureOnRequest: '請求があった場合に遅滞なく開示いたします',
};

export const addressDisplay = legal.address || legal.disclosureOnRequest;
export const phoneDisplay = legal.phone || legal.disclosureOnRequest;
