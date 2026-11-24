import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { getViewer, jstToday } from '@/lib/auth';
import {
  FREE_DAILY_LIMIT,
  FREE_MAX_SECONDS,
  isDemoMode,
  isSupabaseAdminConfigured,
} from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { demoConsume, demoUsed } from '@/lib/demo-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { durationSeconds?: unknown };

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * 解析1本分の利用を検証してカウントする。
 * - 認証必須（デモモードを除く）
 * - Pro: 無制限（カウントしない）
 * - Free: 動画300秒以内 かつ 日本時間の1日3本まで
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

  /* ---------- デモモード（Supabase未設定） ---------- */
  if (isDemoMode()) {
    const store = await cookies();
    let demoId = store.get('fe_demo')?.value;
    const isNew = !demoId;
    if (!demoId) demoId = randomUUID();

    if (duration > FREE_MAX_SECONDS) {
      return json(403, {
        ok: false,
        reason: 'duration_limit',
        message: `無料プランは${FREE_MAX_SECONDS / 60}分（${FREE_MAX_SECONDS}秒）までの動画に対応しています。`,
      });
    }
    const next = demoConsume(demoId, FREE_DAILY_LIMIT);
    const response =
      next === null
        ? json(429, {
            ok: false,
            reason: 'daily_limit',
            message: '本日の無料回数（3回）を使い切りました。日本時間の0時にリセットされます。',
          })
        : json(200, {
            ok: true,
            plan: 'free',
            limit: FREE_DAILY_LIMIT,
            used: next,
            remaining: Math.max(0, FREE_DAILY_LIMIT - next),
            demo: true,
          });
    if (isNew) {
      response.cookies.set('fe_demo', demoId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  }

  /* ---------- 本番（Supabase） ---------- */
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
  if (!viewer) {
    return json(401, {
      ok: false,
      reason: 'unauthenticated',
      message: 'ログインが必要です。ログインし直してからもう一度お試しください。',
    });
  }

  if (viewer.isPro) {
    return json(200, { ok: true, plan: 'pro', limit: null, used: null, remaining: null });
  }

  if (duration > FREE_MAX_SECONDS) {
    return json(403, {
      ok: false,
      reason: 'duration_limit',
      message: `無料プランは${FREE_MAX_SECONDS / 60}分（${FREE_MAX_SECONDS}秒）までの動画に対応しています。`,
    });
  }

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
        return json(429, {
          ok: false,
          reason: 'daily_limit',
          message: '本日の無料回数（3回）を使い切りました。日本時間の0時にリセットされます。',
          used,
          remaining: 0,
        });
      }
      return json(200, {
        ok: true,
        plan: 'free',
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
      return json(429, {
        ok: false,
        reason: 'daily_limit',
        message: '本日の無料回数（3回）を使い切りました。日本時間の0時にリセットされます。',
        used,
        remaining: 0,
      });
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

/** 残り回数の確認（画面の初期表示用・GET） */
export async function GET() {
  if (isDemoMode()) {
    const store = await cookies();
    const demoId = store.get('fe_demo')?.value;
    const used = demoId ? demoUsed(demoId) : 0;
    return json(200, {
      ok: true,
      plan: 'free',
      limit: FREE_DAILY_LIMIT,
      used,
      remaining: Math.max(0, FREE_DAILY_LIMIT - used),
      demo: true,
    });
  }
  const viewer = await getViewer();
  if (!viewer) return json(401, { ok: false, reason: 'unauthenticated' });
  if (viewer.isPro) return json(200, { ok: true, plan: 'pro', limit: null, used: null, remaining: null });

  const db = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const { data } = await db
    .from('daily_usage')
    .select('count')
    .eq('user_id', viewer.user.id)
    .eq('usage_date', jstToday())
    .maybeSingle();
  const used = Number((data as { count?: number } | null)?.count ?? 0);
  return json(200, {
    ok: true,
    plan: 'free',
    limit: FREE_DAILY_LIMIT,
    used,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
  });
}
