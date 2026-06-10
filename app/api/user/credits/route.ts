import { NextResponse } from 'next/server';
import { getSessionByToken, getUserById, updateUser } from '@/lib/auth/store';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: '登录已过期' }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ ok: false, error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: { credits: user.credits } });
  } catch (err) {
    console.error('Get credits error:', err);
    return NextResponse.json({ ok: false, error: '获取积分失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: '未登录' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: '登录已过期' }, { status: 401 });
    }

    const { amount, action } = await request.json();

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ ok: false, error: '用户不存在' }, { status: 404 });
    }

    if (action === 'deduct') {
      if (user.credits < amount) {
        return NextResponse.json({ ok: false, error: '积分不足' }, { status: 400 });
      }
      await updateUser(user.id, { credits: user.credits - amount });
      return NextResponse.json({ ok: true, data: { credits: user.credits - amount } });
    }

    if (action === 'add') {
      await updateUser(user.id, { credits: user.credits + amount });
      return NextResponse.json({ ok: true, data: { credits: user.credits + amount } });
    }

    return NextResponse.json({ ok: false, error: '无效操作' }, { status: 400 });
  } catch (err) {
    console.error('Update credits error:', err);
    return NextResponse.json({ ok: false, error: '更新积分失败' }, { status: 500 });
  }
}
