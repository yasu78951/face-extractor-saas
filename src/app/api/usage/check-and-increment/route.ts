import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getViewer, jstToday } from '@/lib/auth';
import {
  FREE_DAILY_LIMIT,
  FREE_MAX_SECONDS,
  isSupabaseAdminConfigured,
} from '@/lib/env';
import { ANON_USAGE_COOKIE, anonCookieOptions, consumeAnonUsage, serializeAnonUsage } from '@/lib/anon-usage';
import { getUsageSnapshot } from '@/lib/usage';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { durationSeconds?: unknown };

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function durationLimitResponse() {
  return json(403, {
    ok: false,
    reason: 'duration_limit',
    message: `無料プランは${FREE_MAX_SECONDS / 60}分（${FREE_MAX_SECONDS}秒）までの動画に対応しています。`,
    limit: FREE_DAILY_LIMIT,
    maxSeconds: FREE_MAX_SECONDS,
  });
}

function dailyLimitResponse(used: number, anonymous: boolean) {
  return json(429, {
    ok: false,
    reason: 'daily_limit',
    message: '本日の無料回数（3回）を使い切りました。日本時間の0時にリセットされます。',
    anonymous,
    limit: FREE_DAILY_LIMIT,
    used,
    remaining: 0,
  });
}

/**
 * 解析1本分の利用を検証してカウントする。
 * - ログイン済み: Supabase の daily_usage でアカウント単位にカウント（Proは無制限）
 * - 未ログイン: HMAC署名付きCookieでブラウザ単位にカウント（無料プランのみ・1日3本）
 * - どちらも無料プランは 動画300秒以内 かつ 日本時間の1日3本まで
 */
export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return json(400, { ok: false, reason: 'invalid_body', message: 'リクエストの形式が正しくありません。' });
  }

  const duration = Number(body.durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) {
    return json(400, { ok: false, reason: 'invalid_duration', message: '動画の長さを確認できませんでした。' });
  }

  let viewer = null;
  try {
    viewer = await getViewer();
  } catch (error) {
    console.error('[usage] auth error', error);
    return json(503, {
      ok: false,
      reason: 'server_error',
      message: 'ログイン情報を確認できませんでした。時間をおいてもう一度お試しください。',
    });
  }

  /* ---------- Pro（ログイン済み・無制限） ---------- */
  if (viewer?.isPro) {
    return json(200, { ok: true, plan: 'pro', anonymous: false, limit: null, used: null, remaining: null });
  }

  /* ---------- 無料プラン共通の動画長チェック（回数は消費しない） ---------- */
  if (duration > FREE_MAX_SECONDS) {
    return durationLimitResponse();
  }

  /* ---------- ログイン済み・無料プラン ---------- */
  if (viewer) {
    const day = jstToday();
    const db = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : await createSupabaseServerClient();

    try {
      // 原子的に加算するSQL関数（supabase/schema.sql）。上限到達時は -1 を返す。
      const { data, error } = await db.rpc('consume_daily_usage', {
        p_user_id: viewer.user.id,
        p_day: day,
        p_limit: FREE_DAILY_LIMIT,
      });

      if (!error && typeof data === 'number') {
        if (data < 0) {
          const used = Math.abs(data) - 1;
          return dailyLimitResponse(used, false);
        }
        return json(200, {
          ok: true,
          plan: 'free',
          anonymous: false,
          limit: FREE_DAILY_LIMIT,
          used: data,
          remaining: Math.max(0, FREE_DAILY_LIMIT - data),
        });
      }

      if (error) {
        console.warn('[usage] rpc consume_daily_usage failed, falling back to table ops', error.message);
      }

      // フォールバック（SQL関数が未作成の場合）
      const { data: row, error: readError } = await db
        .from('daily_usage')
        .select('count')
        .eq('user_id', viewer.user.id)
        .eq('usage_date', day)
        .maybeSingle();
      if (readError) throw readError;

      const used = Number((row as { count?: number } | null)?.count ?? 0);
      if (used >= FREE_DAILY_LIMIT) {
        return dailyLimitResponse(used, false);
      }

      const nextCount = used + 1;
      const { error: writeError } = await db
        .from('daily_usage')
        .upsert(
          { user_id: viewer.user.id, usage_date: day, count: nextCount, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,usage_date' },
        );
      if (writeError) throw writeError;

      return json(200, {
        ok: true,
        plan: 'free',
        anonymous: false,
        limit: FREE_DAILY_LIMIT,
        used: nextCount,
        remaining: Math.max(0, FREE_DAILY_LIMIT - nextCount),
      });
    } catch (error) {
      console.error('[usage] failed to consume usage', error);
      return json(500, {
        ok: false,
        reason: 'server_error',
        message: '利用回数を記録できませんでした。時間をおいてもう一度お試しください。',
      });
    }
  }

  /* ---------- 未ログイン（匿名・ブラウザ単位） ---------- */
  const store = await cookies();
  const result = consumeAnonUsage(store.get(ANON_USAGE_COOKIE)?.value, FREE_DAILY_LIMIT);

  if (!result.allowed) {
    return dailyLimitResponse(result.usage.count, true);
  }

  const response = json(200, {
    ok: true,
    plan: 'free',
    anonymous: true,
    limit: FREE_DAILY_LIMIT,
    used: result.usage.count,
    remaining: Math.max(0, FREE_DAILY_LIMIT - result.usage.count),
  });
  response.cookies.set(ANON_USAGE_COOKIE, serializeAnonUsage(result.usage), anonCookieOptions(request.url));
  return response;
}

/** 残り回数の確認（画面の初期表示用・GET） */
export async function GET() {
  try {
    const snapshot = await getUsageSnapshot();
    return json(200, { ok: true, ...snapshot });
  } catch (error) {
    console.error('[usage] status error', error);
    return json(503, { ok: false, reason: 'server_error' });
  }
}
