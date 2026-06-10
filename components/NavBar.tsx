'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import AuthModal from './AuthModal';
import CreditShop from './CreditShop';
import Link from 'next/link';

export default function NavBar() {
  const { user, logout, loading } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [shopOpen, setShopOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const bg = isDark ? 'rgba(2,8,16,0.92)' : 'rgba(250,250,249,0.92)';
  const borderClr = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textClr = isDark ? '#e8eef6' : '#1a1a18';
  const mutedClr = isDark ? '#6a7a96' : '#8a8a82';
  const goldClr = isDark ? '#d4a843' : '#b8922a';

  return (
    <>
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: bg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${borderClr}`,
        }}
      >
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: '52px',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ color: goldClr, fontSize: '18px' }}>✦</span>
            <span style={{ color: textClr, fontSize: '15px', fontWeight: 600, letterSpacing: '0.02em' }}>
              紫微研究
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/chart" style={{ color: mutedClr, fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}>
              排盘
            </Link>
            <Link href="/knowledge" style={{ color: mutedClr, fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}>
              知识
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: mutedClr, fontSize: '16px', padding: '6px',
              }}
              title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
            >
              {isDark ? '☀' : '☾'}
            </button>

            {loading ? (
              <span style={{ color: mutedClr, fontSize: '13px' }}>…</span>
            ) : user ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '999px',
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${borderClr}`, cursor: 'pointer',
                    color: textClr, fontSize: '13px',
                  }}
                >
                  <span>{user.name}</span>
                  <span style={{ color: goldClr, fontSize: '12px', fontWeight: 600 }}>{user.credits}积分</span>
                </button>

                {menuOpen && (
                  <>
                    <div
                      onClick={() => setMenuOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    />
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                      background: isDark ? '#0a1020' : '#ffffff',
                      border: `1px solid ${borderClr}`,
                      borderRadius: '12px', padding: '6px',
                      minWidth: '180px', zIndex: 100,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                    }}>
                      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${borderClr}`, marginBottom: '4px' }}>
                        <div style={{ color: textClr, fontSize: '14px', fontWeight: 500 }}>{user.name}</div>
                        <div style={{ color: mutedClr, fontSize: '12px' }}>{user.phone}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShopOpen(true); setMenuOpen(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '8px 12px', borderRadius: '8px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: textClr, fontSize: '13px',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        💰 购买积分
                      </button>
                      <button
                        type="button"
                        onClick={() => { logout(); setMenuOpen(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '8px 12px', borderRadius: '8px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#f87171', fontSize: '13px',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
                  style={{
                    padding: '6px 16px', borderRadius: '999px',
                    background: 'transparent',
                    border: `1px solid ${borderClr}`, cursor: 'pointer',
                    color: textClr, fontSize: '13px',
                  }}
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
                  style={{
                    padding: '6px 16px', borderRadius: '999px',
                    background: goldClr, border: 'none', cursor: 'pointer',
                    color: isDark ? '#08080a' : '#fff', fontSize: '13px', fontWeight: 500,
                  }}
                >
                  注册
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
      <CreditShop open={shopOpen} onClose={() => setShopOpen(false)} />
    </>
  );
}
