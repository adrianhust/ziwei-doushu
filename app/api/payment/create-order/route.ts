import { NextResponse } from 'next/server';
import { getSessionByToken, getUserById, createOrder } from '@/lib/auth/store';
import { generateId } from '@/lib/auth/utils';

const CREDIT_PACKS = [
  { credits: 10, amount: 9.99 },
  { credits: 30, amount: 19.99 },
  { credits: 100, amount: 49.99 },
] as const;

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

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ ok: false, error: '用户不存在' }, { status: 404 });
    }

    const { credits } = await request.json();
    const pack = CREDIT_PACKS.find(p => p.credits === credits);
    if (!pack) {
      return NextResponse.json({ ok: false, error: '无效的积分套餐' }, { status: 400 });
    }

    const order = {
      id: generateId('o'),
      userId: user.id,
      credits: pack.credits,
      amount: pack.amount,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    await createOrder(order);

    // Mock payment URL - in production this would be a real payment gateway
    const paymentUrl = `/api/payment/mock-pay?orderId=${order.id}`;

    return NextResponse.json({
      ok: true,
      data: {
        orderId: order.id,
        credits: pack.credits,
        amount: pack.amount,
        paymentUrl,
      },
    });
  } catch (err) {
    console.error('Create order error:', err);
    return NextResponse.json({ ok: false, error: '创建订单失败' }, { status: 500 });
  }
}
