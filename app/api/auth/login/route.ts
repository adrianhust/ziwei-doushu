import { NextResponse } from 'next/server';
import { getUserByPhone, createSession, deleteUserSessions } from '@/lib/auth/store';
import { hashPassword, generateToken, generateExpiry } from '@/lib/auth/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');

    if (!phone || !password) {
      return NextResponse.json({ ok: false, error: '手机号和密码为必填' }, { status: 400 });
    }

    const user = await getUserByPhone(phone);
    if (!user) {
      return NextResponse.json({ ok: false, error: '手机号未注册' }, { status: 404 });
    }

    if (user.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ ok: false, error: '密码错误' }, { status: 401 });
    }

    await deleteUserSessions(user.id);

    const token = generateToken();
    await createSession({
      userId: user.id,
      token,
      expiresAt: generateExpiry(30),
    });

    return NextResponse.json({
      ok: true,
      data: {
        token,
        user: { id: user.id, phone: user.phone, name: user.name, credits: user.credits },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ ok: false, error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
