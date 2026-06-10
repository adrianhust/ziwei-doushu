'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

const PACKS = [
  { credits: 10, amount: 9.99, label: '体验包' },
  { credits: 30, amount: 19.99, label: '标准包', popular: true },
  { credits: 100, amount: 49.99, label: '畅享包' },
];

interface CreditShopProps {
  open: boolean;
  onClose: () => void;
}

export default function CreditShop({ open, onClose }: CreditShopProps) {
  const [buying, setBuying] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleBuy = async (credits: number) => {
    setBuying(credits);
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('ziwei_auth_token')}` },
        body: JSON.stringify({ credits }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = data.data.paymentUrl;
        }, 800);
      }
    } catch {
      setBuying(null);
    }
  };

  const bg = isDark ? '#0a1020' : '#ffffff';
  const textClr = isDark ? '#e8eef6' : '#1a1a18';
  const mutedClr = isDark ? '#6a7a96' : '#8a8a82';
  const borderClr = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#f9f9f9';
  const goldClr = isDark ? '#d4a843' : '#b8922a';

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
              maxWidth: '460px',
              border: `1px solid ${borderClr}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: textClr, fontSize: '20px', fontWeight: 700 }}>购买积分</h2>
              {user && (
                <span style={{ color: goldClr, fontSize: '14px', fontWeight: 500 }}>
                  当前积分：{user.credits}
                </span>
              )}
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: goldClr, fontSize: '24px', marginBottom: '12px' }}>✓</p>
                <p style={{ color: textClr, fontSize: '16px' }}>订单已创建，正在跳转支付…</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {PACKS.map(pack => (
                  <div
                    key={pack.credits}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', borderRadius: '14px',
                      background: pack.popular ? (isDark ? 'rgba(212,168,67,0.08)' : 'rgba(184,146,42,0.06)') : cardBg,
                      border: `1px solid ${pack.popular ? goldClr : borderClr}`,
                      position: 'relative',
                    }}
                  >
                    <div>
                      {pack.popular && (
                        <span style={{
                          position: 'absolute', top: '-8px', right: '16px',
                          background: goldClr, color: isDark ? '#08080a' : '#fff',
                          fontSize: '10px', fontWeight: 600, padding: '2px 10px',
                          borderRadius: '999px',
                        }}>
                          推荐
                        </span>
                      )}
                      <div style={{ color: textClr, fontSize: '16px', fontWeight: 600 }}>
                        {pack.label}
                      </div>
                      <div style={{ color: goldClr, fontSize: '24px', fontWeight: 700 }}>
                        {pack.credits}<span style={{ fontSize: '14px', fontWeight: 400, color: mutedClr }}> 积分</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: textClr, fontSize: '20px', fontWeight: 700 }}>
                        ¥{pack.amount}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBuy(pack.credits)}
                        disabled={buying === pack.credits}
                        style={{
                          marginTop: '8px', padding: '8px 20px', borderRadius: '999px',
                          background: buying === pack.credits ? 'transparent' : goldClr,
                          color: buying === pack.credits ? goldClr : (isDark ? '#08080a' : '#fff'),
                          fontSize: '13px', fontWeight: 500, border: buying === pack.credits ? `1px solid ${goldClr}` : 'none',
                          cursor: buying === pack.credits ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {buying === pack.credits ? '处理中…' : '立即购买'}
                      </button>
                    </div>
                  </div>
                ))}

                <p style={{ color: mutedClr, fontSize: '11px', textAlign: 'center', marginTop: '12px' }}>
                  支付成功后积分自动到账 · 每次排盘消耗1积分
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
