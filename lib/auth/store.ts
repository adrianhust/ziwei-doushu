import { promises as fs } from 'fs';
import path from 'path';
import type { User, TestRecord, Order, Session, VerificationCode } from './types';

const DATA_DIR = process.env.DATA_DIR
  || (process.env.VERCEL ? '/tmp/data' : path.join(process.cwd(), 'data'));

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

async function readJSON<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Users
export async function getUsers(): Promise<User[]> {
  return readJSON<User[]>(USERS_FILE, []);
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.phone === phone);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.id === id);
}

export async function createUser(user: User): Promise<void> {
  const users = await getUsers();
  users.push(user);
  await writeJSON(USERS_FILE, users);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return undefined;
  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  await writeJSON(USERS_FILE, users);
  return users[idx];
}

// Test Records
export async function getTestRecords(): Promise<TestRecord[]> {
  return readJSON<TestRecord[]>(RECORDS_FILE, []);
}

export async function getFreeTestCount(deviceId: string): Promise<number> {
  const records = await getTestRecords();
  return records.filter(r => r.deviceId === deviceId).length;
}

export async function createTestRecord(record: TestRecord): Promise<void> {
  const records = await getTestRecords();
  records.push(record);
  await writeJSON(RECORDS_FILE, records);
}

// Orders
export async function getOrders(): Promise<Order[]> {
  return readJSON<Order[]>(ORDERS_FILE, []);
}

export async function createOrder(order: Order): Promise<void> {
  const orders = await getOrders();
  orders.push(order);
  await writeJSON(ORDERS_FILE, orders);
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
  const orders = await getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return undefined;
  orders[idx] = { ...orders[idx], ...updates };
  await writeJSON(ORDERS_FILE, orders);
  return orders[idx];
}

// Sessions
export async function getSessions(): Promise<Session[]> {
  return readJSON<Session[]>(SESSIONS_FILE, []);
}

export async function createSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.push(session);
  await writeJSON(SESSIONS_FILE, sessions);
}

export async function getSessionByToken(token: string): Promise<Session | undefined> {
  const sessions = await getSessions();
  return sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
}

export async function deleteSession(token: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.token !== token);
  await writeJSON(SESSIONS_FILE, filtered);
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.userId !== userId);
  await writeJSON(SESSIONS_FILE, filtered);
}

// Verification Codes
const CODES_FILE = path.join(DATA_DIR, 'codes.json');

export async function getVerificationCodes(): Promise<VerificationCode[]> {
  return readJSON<VerificationCode[]>(CODES_FILE, []);
}

export async function createVerificationCode(code: VerificationCode): Promise<void> {
  const codes = await getVerificationCodes();
  codes.push(code);
  await writeJSON(CODES_FILE, codes);
}

export async function getValidCode(target: string, code: string): Promise<VerificationCode | undefined> {
  const codes = await getVerificationCodes();
  return codes.find(c =>
    c.target === target &&
    c.code === code &&
    !c.used &&
    new Date(c.expiresAt) > new Date()
  );
}

export async function markCodeUsed(id: string): Promise<void> {
  const codes = await getVerificationCodes();
  const idx = codes.findIndex(c => c.id === id);
  if (idx !== -1) {
    codes[idx].used = true;
    await writeJSON(CODES_FILE, codes);
  }
}

export async function cleanupExpiredCodes(): Promise<void> {
  const codes = await getVerificationCodes();
  const now = new Date();
  const valid = codes.filter(c => new Date(c.expiresAt) > now || !c.used);
  await writeJSON(CODES_FILE, valid);
}
