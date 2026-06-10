import { NextResponse } from 'next/server';
import { getTestRecords, createTestRecord, getSessionByToken } from '@/lib/auth/store';
import { generateId } from '@/lib/auth/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ ok: false, error: '缺少设备标识' }, { status: 400 });
    }

    const records = await getTestRecords();
    const count = records.filter(r => r.deviceId === deviceId).length;

    return NextResponse.json({ ok: true, data: { count, freeLimit: 1 } });
  } catch (err) {
    console.error('Get test records error:', err);
    return NextResponse.json({ ok: false, error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { deviceId, type } = await request.json();

    if (!deviceId || !type) {
      return NextResponse.json({ ok: false, error: '缺少参数' }, { status: 400 });
    }

    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = await getSessionByToken(token);
      if (session) {
        userId = session.userId;
      }
    }

    const record = {
      id: generateId('r'),
      userId,
      deviceId,
      type: type as 'chart' | 'heming',
      createdAt: new Date().toISOString(),
    };

    await createTestRecord(record);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Create test record error:', err);
    return NextResponse.json({ ok: false, error: '记录失败' }, { status: 500 });
  }
}
