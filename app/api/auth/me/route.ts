import { NextResponse } from 'next/server';
import { getSessionByToken, getUserById } from '@/lib/auth/store';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: '登录已过期，请重新登录' }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ ok: false, error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        credits: user.credits,
      },
    });
  } catch (err) {
    console.error('Get user error:', err);
    return NextResponse.json({ ok: false, error: '获取用户信息失败' }, { status: 500 });
  }
}
