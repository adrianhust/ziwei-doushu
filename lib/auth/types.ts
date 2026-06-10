export interface User {
  id: string;
  phone: string;
  name: string;
  passwordHash: string;
  credits: number;
  totalCreditsPurchased: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestRecord {
  id: string;
  userId: string | null;
  deviceId: string;
  type: 'chart' | 'heming';
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  credits: number;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: string;
  paidAt?: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface VerificationCode {
  id: string;
  target: string;
  code: string;
  type: 'sms' | 'email';
  purpose: 'reset-password';
  expiresAt: string;
  used: boolean;
  createdAt: string;
}
