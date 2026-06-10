import { NextResponse } from 'next/server';
import { getOrders, updateOrder, getUserById, updateUser } from '@/lib/auth/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.redirect(new URL('/chart?payment=cancelled', request.url));
    }

    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return NextResponse.redirect(new URL('/chart?payment=invalid', request.url));
    }

    if (order.status === 'paid') {
      return NextResponse.redirect(new URL('/chart?payment=already-paid', request.url));
    }

    await updateOrder(orderId, { status: 'paid', paidAt: new Date().toISOString() });

    const user = await getUserById(order.userId);
    if (user) {
      await updateUser(user.id, {
        credits: user.credits + order.credits,
        totalCreditsPurchased: user.totalCreditsPurchased + order.credits,
      });
    }

    return NextResponse.redirect(new URL(`/chart?payment=success&credits=${order.credits}`, request.url));
  } catch (err) {
    console.error('Mock pay error:', err);
    return NextResponse.redirect(new URL('/chart?payment=error', request.url));
  }
}
