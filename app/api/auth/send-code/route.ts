import { NextRequest, NextResponse } from 'next/server';
import { getUserByPhone, createVerificationCode, cleanupExpiredCodes } from '@/lib/auth/store';
import { generateId } from '@/lib/auth/utils';
import type { VerificationCode } from '@/lib/auth/types';

export async function POST(req: NextRequest) {
  try {
    const { target, type } = await req.json();

    if (!target || !type) {
      return NextResponse.json({ ok: false, error: '请提供手机号或邮箱' }, { status: 400 });
    }

    if (type !== 'sms' && type !== 'email') {
      return NextResponse.json({ ok: false, error: '类型错误' }, { status: 400 });
    }

    // Validate phone format
    if (type === 'sms' && !/^1\d{10}$/.test(target)) {
      return NextResponse.json({ ok: false, error: '手机号格式不正确' }, { status: 400 });
    }

    // Validate email format
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      return NextResponse.json({ ok: false, error: '邮箱格式不正确' }, { status: 400 });
    }

    // Check if user exists
    if (type === 'sms') {
      const user = await getUserByPhone(target);
      if (!user) {
        return NextResponse.json({ ok: false, error: '该手机号未注册' }, { status: 404 });
      }
    }

    // Rate limiting: check if a valid code was sent in the last 60 seconds
    await cleanupExpiredCodes();
    const { getVerificationCodes } = await import('@/lib/auth/store');
    const existingCodes = await getVerificationCodes();
    const recentCode = existingCodes.find(c =>
      c.target === target &&
      c.purpose === 'reset-password' &&
      !c.used &&
      new Date(c.createdAt).getTime() > Date.now() - 60000
    );
    if (recentCode) {
      return NextResponse.json({ ok: false, error: '验证码已发送，请稍后再试' }, { status: 429 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code (expires in 5 minutes)
    const codeRecord: VerificationCode = {
      id: generateId('vc'),
      target,
      code,
      type,
      purpose: 'reset-password',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    };
    await createVerificationCode(codeRecord);

    // Send code (mock: log to console)
    // In production, replace with real SMS/email service:
    // - SMS: aliyun SMS, twilio, etc.
    // - Email: nodemailer, resend, etc.
    if (type === 'sms') {
      console.log(`[SMS] 验证码已发送至 ${target}: ${code} (5分钟有效)`);
    } else {
      console.log(`[Email] 验证码已发送至 ${target}: ${code} (5分钟有效)`);
    }

    return NextResponse.json({ ok: true, message: '验证码已发送' });
  } catch (err) {
    console.error('send-code error:', err);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
