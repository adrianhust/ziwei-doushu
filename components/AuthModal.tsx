'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  mode?: 'login' | 'register';
}

export default function AuthModal({ open, onClose, mode: initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeTarget, setCodeTarget] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const { login, register, sendVerifyCode, resetPassword } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Reset state when mode changes
  useEffect(() => {
    setError('');
    setSubmitting(false);
  }, [mode, forgotStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const errMsg = mode === 'login'
      ? await login(phone, password)
      : await register(phone, password, name);

    if (errMsg) {
      setError(errMsg);
      setSubmitting(false);
    } else {
      onClose();
    }
  };

  const handleSendCode = async () => {
    setError('');
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号');
      return;
    }
    setSubmitting(true);
    const errMsg = await sendVerifyCode(phone, 'sms');
    setSubmitting(false);
    if (errMsg) {
      setError(errMsg);
    } else {
      setCodeTarget(phone);
      setForgotStep(2);
      setCountdown(60);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setSubmitting(true);
    const errMsg = await resetPassword(codeTarget, code, newPassword);
    setSubmitting(false);
    if (errMsg) {
      setError(errMsg);
    } else {
      onClose();
    }
  };

  const switchMode = (next: 'login' | 'register' | 'forgot') => {
    setMode(next);
    setForgotStep(1);
    setError('');
    setPhone('');
    setPassword('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const bg = isDark ? '#0a1020' : '#ffffff';
  const textClr = isDark ? '#e8eef6' : '#1a1a18';
  const mutedClr = isDark ? '#6a7a96' : '#8a8a82';
  const borderClr = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5';
  const goldClr = isDark ? '#d4a843' : '#b8922a';
  const errorClr = isDark ? '#f87171' : '#dc2626';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '12px',
    background: inputBg, border: `1px solid ${borderClr}`,
    color: textClr, fontSize: '14px', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', color: mutedClr, marginBottom: '4px',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: bg,
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '400px',
              border: `1px solid ${borderClr}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* ── Login / Register ── */}
            {mode !== 'forgot' && (
              <>
                <h2 style={{ color: textClr, fontSize: '22px', fontWeight: 700, marginBottom: '4px', textAlign: 'center' }}>
                  {mode === 'login' ? '欢迎回来' : '创建账号'}
                </h2>
                <p style={{ color: mutedClr, fontSize: '13px', marginBottom: '24px', textAlign: 'center' }}>
                  {mode === 'login' ? '登录后可继续使用紫微斗数排盘' : '注册即送10积分，免费排盘'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {mode === 'register' && (
                    <div>
                      <label style={labelStyle}>昵称</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="请输入昵称" required style={inputStyle} />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>手机号</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号" required pattern="1\d{10}" style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>密码</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码（至少6位）" required minLength={6} style={inputStyle} />
                  </div>

                  {error && <p style={{ color: errorClr, fontSize: '13px', textAlign: 'center' }}>{error}</p>}

                  <button type="submit" disabled={submitting} style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    background: submitting ? (isDark ? 'rgba(212,168,67,0.3)' : 'rgba(184,146,42,0.3)') : goldClr,
                    color: submitting ? (isDark ? 'rgba(232,238,246,0.4)' : 'rgba(26,26,24,0.4)') : (isDark ? '#08080a' : '#fff'),
                    fontSize: '14px', fontWeight: 600, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}>
                    {submitting ? (mode === 'login' ? '登录中…' : '注册中…') : (mode === 'login' ? '登录' : '注册')}
                  </button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                  <button type="button" onClick={() => switchMode('forgot')} style={{ color: goldClr, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                    忘记密码？
                  </button>
                  <p style={{ color: mutedClr, fontSize: '13px' }}>
                    {mode === 'login' ? '还没有账号？' : '已有账号？'}
                    <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} style={{ color: goldClr, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                      {mode === 'login' ? '立即注册' : '去登录'}
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* ── Forgot Password Step 1: Enter phone ── */}
            {mode === 'forgot' && forgotStep === 1 && (
              <>
                <h2 style={{ color: textClr, fontSize: '22px', fontWeight: 700, marginBottom: '4px', textAlign: 'center' }}>
                  找回密码
                </h2>
                <p style={{ color: mutedClr, fontSize: '13px', marginBottom: '24px', textAlign: 'center' }}>
                  输入注册时使用的手机号，我们将发送验证码
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>手机号</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号" pattern="1\d{10}" style={inputStyle} />
                  </div>

                  {error && <p style={{ color: errorClr, fontSize: '13px', textAlign: 'center' }}>{error}</p>}

                  <button onClick={handleSendCode} disabled={submitting} style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    background: submitting ? (isDark ? 'rgba(212,168,67,0.3)' : 'rgba(184,146,42,0.3)') : goldClr,
                    color: submitting ? (isDark ? 'rgba(232,238,246,0.4)' : 'rgba(26,26,24,0.4)') : (isDark ? '#08080a' : '#fff'),
                    fontSize: '14px', fontWeight: 600, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}>
                    {submitting ? '发送中…' : '发送验证码'}
                  </button>
                </div>

                <p style={{ color: mutedClr, fontSize: '13px', textAlign: 'center', marginTop: '16px' }}>
                  <button type="button" onClick={() => switchMode('login')} style={{ color: goldClr, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                    ← 返回登录
                  </button>
                </p>
              </>
            )}

            {/* ── Forgot Password Step 2: Enter code + new password ── */}
            {mode === 'forgot' && forgotStep === 2 && (
              <>
                <h2 style={{ color: textClr, fontSize: '22px', fontWeight: 700, marginBottom: '4px', textAlign: 'center' }}>
                  重置密码
                </h2>
                <p style={{ color: mutedClr, fontSize: '13px', marginBottom: '24px', textAlign: 'center' }}>
                  验证码已发送至 {codeTarget.slice(0, 3)}****{codeTarget.slice(7)}
                </p>

                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>验证码</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6位验证码" maxLength={6} style={{ ...inputStyle, flex: 1, letterSpacing: '0.2em', textAlign: 'center', fontSize: '18px', fontWeight: 600 }} />
                      <button type="button" onClick={handleSendCode} disabled={countdown > 0 || submitting} style={{
                        padding: '10px 16px', borderRadius: '12px', border: `1px solid ${borderClr}`,
                        background: countdown > 0 ? inputBg : 'transparent',
                        color: countdown > 0 ? mutedClr : goldClr,
                        fontSize: '12px', cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}>
                        {countdown > 0 ? `${countdown}s` : '重新发送'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>新密码</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="请输入新密码（至少6位）" minLength={6} style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>确认密码</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="请再次输入密码" minLength={6} style={inputStyle} />
                  </div>

                  {error && <p style={{ color: errorClr, fontSize: '13px', textAlign: 'center' }}>{error}</p>}

                  <button type="submit" disabled={submitting} style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    background: submitting ? (isDark ? 'rgba(212,168,67,0.3)' : 'rgba(184,146,42,0.3)') : goldClr,
                    color: submitting ? (isDark ? 'rgba(232,238,246,0.4)' : 'rgba(26,26,24,0.4)') : (isDark ? '#08080a' : '#fff'),
                    fontSize: '14px', fontWeight: 600, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}>
                    {submitting ? '重置中…' : '重置密码'}
                  </button>
                </form>

                <p style={{ color: mutedClr, fontSize: '13px', textAlign: 'center', marginTop: '16px' }}>
                  <button type="button" onClick={() => switchMode('login')} style={{ color: goldClr, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                    ← 返回登录
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
