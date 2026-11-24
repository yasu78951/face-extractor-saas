/**
 * Supabase未接続（デモモード）時の回数カウント。
 * プロセス内メモリだけの簡易実装で、再起動するとリセットされる。
 * 本番の制限はSupabase（daily_usage）で行う。
 */

type Store = Map<string, number>;

const GLOBAL_KEY = '__fe_demo_usage_store__';

function store(): Store {
  const g = globalThis as unknown as Record<string, Store | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map<string, number>();
  return g[GLOBAL_KEY] as Store;
}

export function demoUsed(demoId: string): number {
  return store().get(demoId) ?? 0;
}

/** 上限内なら加算して新しい使用数を返す。上限に達していたら null */
export function demoConsume(demoId: string, limit: number): number | null {
  const used = demoUsed(demoId);
  if (used >= limit) return null;
  const next = used + 1;
  store().set(demoId, next);
  return next;
}

export function demoReset(demoId: string): void {
  store().delete(demoId);
}
