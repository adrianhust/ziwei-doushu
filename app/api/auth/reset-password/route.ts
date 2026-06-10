import { NextRequest, NextResponse } from 'next/server';
import { getUserByPhone, getValidCode, markCodeUsed, updateUser, createSession } from '@/lib/auth/store';
import { hashPassword, generateToken, generateExpiry } from '@/lib/auth/utils';

export async function POST(req: NextRequest) {
  try {
    const { target, code, newPassword } = await req.json();

    if (!target || !code || !newPassword) {
      return NextResponse.json({ ok: false, error: '请填写完整信息' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: '密码至少6位' }, { status: 400 });
    }

    // Find and validate the code
    const codeRecord = await getValidCode(target, code);
    if (!codeRecord) {
      return NextResponse.json({ ok: false, error: '验证码无效或已过期' }, { status: 400 });
    }

    // Find user by phone (sms) or email
    let user;
    if (codeRecord.type === 'sms') {
      user = await getUserByPhone(target);
    }
    // For email, we'd need a getUserByEmail function
    // For now, only phone-based reset is supported

    if (!user) {
      return NextResponse.json({ ok: false, error: '用户不存在' }, { status: 404 });
    }

    // Mark code as used
    await markCodeUsed(codeRecord.id);

    // Update password
    const passwordHash = hashPassword(newPassword);
    await updateUser(user.id, { passwordHash });

    // Create new session (auto-login after reset)
    const token = generateToken();
    const expiresAt = generateExpiry(30);
    await createSession({ userId: user.id, token, expiresAt });

    return NextResponse.json({
      ok: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          credits: user.credits,
        },
      },
    });
  } catch (err) {
    console.error('reset-password error:', err);
    return NextResponse.json({ ok: false, error: '服务器错误' }, { status: 500 });
  }
}
