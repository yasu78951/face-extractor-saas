import { NextResponse } from 'next/server';
import { getUsageSnapshot } from '@/lib/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 現在の残り回数（GET）。
 * - ログイン済み: アカウントの利用状況
 * - 未ログイン: 署名Cookie（fe_anon）の利用状況
 * 画面の再読み込みや別タブでの表示同期に使う。
 */
export async function GET() {
  try {
    const snapshot = await getUsageSnapshot();
    return NextResponse.json(
      { ok: true, ...snapshot },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[usage/status] failed', error);
    return NextResponse.json(
      { ok: false, reason: 'server_error' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
