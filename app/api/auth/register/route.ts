import { NextResponse } from 'next/server';
import { createUser, getUserByPhone } from '@/lib/auth/store';
import { hashPassword, generateToken, generateId, generateExpiry } from '@/lib/auth/utils';
import { createSession } from '@/lib/auth/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = String(body.phone || '').replace(/\D/g, '');
    const password = String(body.password || '');
    const name = String(body.name || '').trim();

    if (!phone || !password || !name) {
      return NextResponse.json({ ok: false, error: '手机号、密码、姓名均为必填' }, { status: 400 });
    }

    if (!/^1\d{10}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: '请输入正确的手机号' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: '密码至少6位' }, { status: 400 });
    }

    const existing = await getUserByPhone(phone);
    if (existing) {
      return NextResponse.json({ ok: false, error: '该手机号已注册' }, { status: 409 });
    }

    const userId = generateId('u');
    const user = {
      id: userId,
      phone,
      name,
      passwordHash: hashPassword(password),
      credits: 10,
      totalCreditsPurchased: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createUser(user);

    const token = generateToken();
    await createSession({
      userId,
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
    console.error('Register error:', err);
    return NextResponse.json({ ok: false, error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
