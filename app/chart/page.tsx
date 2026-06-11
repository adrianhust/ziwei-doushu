'use client';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import { type TimeView, getYearStemIndex, buildSiHuaOverlay, SIHUA_COLORS } from '@/components/TimeNav';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import AuthModal from '@/components/AuthModal';
import CreditShop from '@/components/CreditShop';
import { useAuth } from '@/components/AuthProvider';
import { getDeviceId, markFreeTrialUsed, hasUsedFreeTrial } from '@/lib/auth/utils';
import { STEMS, BRANCHES } from '@/lib/ziwei/constants';
import { detectPatterns } from '@/lib/ziwei/patterns';

const STORAGE_KEY_PREFIX = 'ziwei_saved_birth_info';

export default function ChartPage() {
  const { user, token, loading, deductCredits } = useAuth();
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const storageKey = useMemo(
    () => (user ? `${STORAGE_KEY_PREFIX}_${user.id}` : `${STORAGE_KEY_PREFIX}_anon`),
    [user],
  );
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [selectedSiHua, setSelectedSiHua] = useState<{ starName: string; siHua: string; view: TimeView } | null>(null);
  const [view, setView] = useState<TimeView>('mingpan');
  const [liunianYear, setLiunianYear] = useState(() => new Date().getFullYear());
  const [pendingInfo, setPendingInfo] = useState<BirthInfo | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [patternsOpen, setPatternsOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const handlingRef = useRef(false);

  const doGenerate = useCallback((info: BirthInfo) => {
    setChart(generateChart(info));
    setPendingInfo(null);
    setSubmitting(false);
  }, []);

  const handleSubmit = useCallback(async (info: BirthInfo) => {
    setSubmitting(true);
    setMsg(null);

    if (!hasUsedFreeTrial()) {
      markFreeTrialUsed();
      try {
        await fetch('/api/user/test-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: getDeviceId(), type: 'chart' }),
        });
      } catch {}
      try { localStorage.setItem(storageKey, JSON.stringify(info)); } catch {}
      doGenerate(info);
      return;
    }

    if (user && token) {
      const ok = await deductCredits(1);
      if (ok) {
        try {
          await fetch('/api/user/test-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ deviceId: getDeviceId(), type: 'chart' }),
          });
        } catch {}
        try { localStorage.setItem(storageKey, JSON.stringify(info)); } catch {}
        doGenerate(info);
      } else {
        setMsg('积分不足，请购买积分后继续使用');
        setPendingInfo(info);
        setSubmitting(false);
      }
      return;
    }

    if (!loading) {
      setMsg('免费体验已用完，请登录后继续使用');
      setPendingInfo(info);
      setSubmitting(false);
      setAuthOpen(true);
    }
  }, [user, token, loading, deductCredits, doGenerate]);

  useEffect(() => {
    if (user && token && pendingInfo && !handlingRef.current) {
      handlingRef.current = true;
      const retry = async () => {
        setSubmitting(true);
        setMsg(null);
        const ok = await deductCredits(1);
        if (ok) {
          try {
            await fetch('/api/user/test-record', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ deviceId: getDeviceId(), type: 'chart' }),
            });
          } catch {}
          try { localStorage.setItem(storageKey, JSON.stringify(pendingInfo)); } catch {}
          doGenerate(pendingInfo);
        } else {
          setMsg('积分不足，请购买积分后继续使用');
          setSubmitting(false);
          setPendingInfo(null);
        }
        handlingRef.current = false;
      };
      retry();
    }
  }, [user, token, pendingInfo, deductCredits, doGenerate]);

  const currentDx = chart ? chart.daXians[chart.currentDaXianIndex] : null;
  const detectedPatterns = chart ? detectPatterns(chart) : [];

  // 四化 overlay info
  const overlayInfo = (() => {
    if (!chart) return null;
    if (view === 'daxian' && currentDx) {
      const dxPalace = chart.palaces.find(p => p.branch === currentDx.palaceBranch);
      if (!dxPalace) return null;
      const stemIndex = dxPalace.stem;
      return { stemName: STEMS[stemIndex], overlay: buildSiHuaOverlay(stemIndex) };
    }
    if (view === 'liunian') {
      const stemIndex = getYearStemIndex(liunianYear);
      return { stemName: STEMS[stemIndex], overlay: buildSiHuaOverlay(stemIndex) };
    }
    return null;
  })();

  // 流年天干地支
  const liunianGanZhi = (() => {
    const stemIndex = getYearStemIndex(liunianYear);
    const branchIndex = ((liunianYear - 4) % 12 + 12) % 12;
    return `${STEMS[stemIndex]}${BRANCHES[branchIndex]}`;
  })();

  const handleSiHuaClick = useCallback((starName: string, siHua: string, v: TimeView) => {
    setSelectedSiHua({ starName, siHua, view: v });
  }, []);

  // 天干地支计算
  const yearGanZhi = chart ? (() => {
    const stem = getYearStemIndex(chart.birthInfo.year);
    const branch = (chart.birthInfo.year - 4) % 12;
    return STEMS[stem] + BRANCHES[(branch + 12) % 12];
  })() : '';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved: BirthInfo = JSON.parse(raw);
      if (!saved || !saved.year || !saved.month || !saved.day || saved.hour == null || !saved.gender) return;
      setChart(generateChart(saved));
    } catch {
      // Ignore invalid or unavailable storage
    }
  }, [storageKey]);

  // ── 未起盘：展示出生信息表单 ──
  if (!chart) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>紫微斗数排盘</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 14, lineHeight: 1.7 }}>
          输入出生年月日时，开源排盘引擎即时生成命盘。
          <br />
          （首次体验免费，之后每次消耗1积分。注册即送10积分。）
        </p>

        {msg && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 16,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠</span>
            <span style={{ flex: 1 }}>{msg}</span>
            {msg.includes('积分不足') && (
              <button
                type="button"
                onClick={() => setShopOpen(true)}
                style={{
                  padding: '4px 12px', borderRadius: 6, background: '#f87171',
                  color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
                }}
              >
                去购买
              </button>
            )}
          </div>
        )}

        <BirthForm onSubmit={handleSubmit} loading={submitting} />

        <CreditShop open={shopOpen} onClose={() => setShopOpen(false)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </main>
    );
  }

  // ── 已起盘 ──
  return (
    <div className="chart-page-root">

      {/* ─── 顶栏 ─── */}
      <header className="chart-topbar">
        <button
          type="button"
          onClick={() => { setChart(null); setSelectedPalace(null); setSelectedSiHua(null); }}
          className="text-xs font-medium flex items-center gap-1 whitespace-nowrap"
          style={{ color: 'var(--tx-3)' }}
        >
          ‹ 返回
        </button>
        <div className="chart-topbar-back-sep" />

        <div className="chart-topbar-tabs">
          {([
            { key: 'mingpan', label: '本命' },
            { key: 'daxian', label: currentDx ? `大限 ${currentDx.startAge}–${currentDx.endAge}` : '大限' },
            { key: 'liunian', label: '流年', hasPicker: true },
            { key: 'liuyue', label: '流月' },
            { key: 'liuri', label: '流日' },
            { key: 'liushi', label: '流时' },
          ] as const).map(tab => (
            <div key={tab.key} className="flex items-center">
              <button
                onClick={() => { setView(tab.key as TimeView); }}
                className="font-medium rounded-md transition-colors whitespace-nowrap"
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  background: view === tab.key ? 'var(--bg-card)' : 'transparent',
                  color: view === tab.key ? 'var(--tx-0)' : 'var(--tx-3)',
                  boxShadow: view === tab.key ? 'var(--sh-xs)' : 'none',
                }}
              >
                {tab.label}
              </button>
              {(tab as any).hasPicker && view === 'liunian' && (
                <div className="flex items-center gap-0.5 ml-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); setLiunianYear(y => y - 1); setView('liunian'); }}
                    className="text-[9px] w-4 h-4 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: 'var(--tx-3)' }}
                  >
                    ‹
                  </button>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--tx-0)' }}>
                    {liunianYear}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setLiunianYear(y => y + 1); setView('liunian'); }}
                    className="text-[9px] w-4 h-4 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: 'var(--tx-3)' }}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto no-print">
          <button
            onClick={() => setShareOpen(true)}
            className="text-[13px] px-4 py-2 rounded-lg font-medium active:scale-95 transition-transform"
            style={{ color: 'var(--tx-2)', background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
          >
            分享
          </button>
          <button
            className="chart-topbar-export text-[13px] px-4 py-2 rounded-lg font-medium active:scale-95 transition-transform"
            style={{ color: 'var(--tx-2)', background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
          >
            导出
          </button>
          <button
            className="text-[13px] px-4 py-2 rounded-lg font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
            style={{ color: 'var(--tx-2)', background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
          >
            <span>📜</span> 历史
          </button>
          <button
            className="text-[13px] px-4 py-2 rounded-lg font-medium active:scale-95 transition-transform"
            style={{ color: 'var(--tx-2)', background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
          >
            反馈
          </button>
        </div>
      </header>

      {/* ─── 工作区 ─── */}
      <div className="chart-workspace">

        {/* ─── 左面板 ─── */}
        <div className="chart-workspace-left">

          <ChartBoard
            chart={chart}
            view={view}
            liunianYear={liunianYear}
            onViewChange={setView}
            onYearChange={setLiunianYear}
            onPalaceSelect={setSelectedPalace}
            onSiHuaClick={handleSiHuaClick}
          />

          {/* ── 四化叠加信息 ── */}
          {overlayInfo && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3 px-1 flex-wrap text-[11px]"
            >
              <span style={{ color: 'var(--tx-3)' }}>
                {view === 'daxian' ? '大限' : `${liunianYear}`}·{overlayInfo.stemName}年四化：
              </span>
              {(['禄', '权', '科', '忌'] as const).map(sh => {
                const starName = Object.keys(overlayInfo.overlay).find(k => overlayInfo.overlay[k] === sh);
                if (!starName) return null;
                return (
                  <span key={sh} className="font-medium" style={{ color: SIHUA_COLORS[sh] }}>
                    {starName}化{sh}
                  </span>
                );
              })}
            </motion.div>
          )}

          {/* ── 大限时间线 ── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card mt-4 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--tx-0)' }}>
                大限
              </h3>
              <span className="text-[9px]" style={{ color: 'var(--tx-3)' }}>
                {view === 'daxian' ? '当前选中' : '点击切换'}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              {chart.daXians.map((dx, i) => {
                const isCurrent = i === chart.currentDaXianIndex;
                const isSelected = view === 'daxian' && i === chart.currentDaXianIndex;
                return (
                  <button
                    key={i}
                    onClick={() => setView('daxian')}
                    className="flex-shrink-0 rounded-lg px-2.5 py-2 text-center transition-all duration-150"
                    style={{
                      minWidth: 72,
                      background: isSelected ? 'rgba(212,168,67,0.1)' : isCurrent ? 'var(--bg-1)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(212,168,67,0.25)' : isCurrent ? 'var(--bdr-med)' : 'var(--bdr)'}`,
                    }}
                  >
                    <div className="text-[8px] font-medium" style={{ color: isCurrent ? 'var(--ac)' : 'var(--tx-3)' }}>
                      {dx.palaceName}
                    </div>
                    <div className="text-[9px] font-mono tabular-nums mt-0.5" style={{ color: isCurrent ? 'var(--tx-0)' : 'var(--tx-2)' }}>
                      {dx.startAge}–{dx.endAge}岁
                    </div>
                    <div className="text-[8px] mt-0.5" style={{ color: isCurrent ? 'var(--tx-3)' : 'var(--tx-3)' }}>
                      {BRANCHES[dx.palaceBranch]}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* ── 流年信息 ── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card mt-3 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--tx-0)' }}>
                流年
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setLiunianYear(y => y - 1); setView('liunian'); }}
                  className="text-[10px] w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--tx-3)' }}
                >
                  ‹
                </button>
                <button
                  onClick={() => setView('liunian')}
                  className="text-[10px] font-medium"
                  style={{ color: view === 'liunian' ? 'var(--ac)' : 'var(--tx-0)' }}
                >
                  {liunianYear}
                </button>
                <button
                  onClick={() => { setLiunianYear(y => y + 1); setView('liunian'); }}
                  className="text-[10px] w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--tx-3)' }}
                >
                  ›
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span style={{ color: 'var(--tx-2)' }}>
                干支：<span className="font-medium" style={{ color: 'var(--tx-0)' }}>{liunianGanZhi}</span>
              </span>
              {overlayInfo && view === 'liunian' && (
                <span style={{ color: 'var(--tx-2)' }}>
                  流年四化：
                  {(['禄', '权', '科', '忌'] as const).map(sh => {
                    const sn = Object.keys(overlayInfo.overlay).find(k => overlayInfo.overlay[k] === sh);
                    if (!sn) return null;
                    return (
                      <span key={sh} className="font-medium ml-1" style={{ color: SIHUA_COLORS[sh] }}>
                        {sn}化{sh}
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: 'var(--tx-3)' }}>
              以流年天干地支定十二宫，配合大限四化飞星论断当年运势
            </div>
          </motion.section>

          {/* ── 流月 / 流日 / 流时 ── */}
          {(['liuyue', 'liuri', 'liushi'] as const).map((k, idx) => {
            const labels: Record<string, string> = { liuyue: '流月', liuri: '流日', liushi: '流时' };
            const descs: Record<string, string> = {
              liuyue: '以流年天干地支分月，逐月论断当月吉凶',
              liuri: '逐日细推，断每日之得失进退',
              liushi: '以日干定十二时辰，断每时之机变',
            };
            return (
              <motion.section
                key={k}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + idx * 0.05 }}
                className="card mt-3 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--tx-0)' }}>
                    {labels[k]}
                  </h3>
                  <button
                    onClick={() => setView(k)}
                    className="text-[9px] rounded-md px-2 py-0.5 transition-colors"
                    style={{
                      color: view === k ? 'var(--ac)' : 'var(--tx-3)',
                      background: view === k ? 'rgba(212,168,67,0.08)' : 'transparent',
                    }}
                  >
                    {view === k ? '当前' : '查看'}
                  </button>
                </div>
                <div className="text-[10px]" style={{ color: 'var(--tx-3)' }}>
                  {descs[k]}
                </div>
              </motion.section>
            );
          })}

          {/* ── 出生信息 ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-3 mt-4 text-[9px] flex-wrap"
            style={{ color: 'var(--tx-3)' }}
          >
            <span>
              {chart.birthInfo.year}年{chart.birthInfo.month}月{chart.birthInfo.day}日
              {chart.birthInfo.hour ? ` ${chart.birthInfo.hour}时` : ''}
              {chart.birthInfo.gender === 'male' ? ' · 男' : ' · 女'}
            </span>
            <span>·</span>
            <span>命宫 {BRANCHES[chart.mingGongBranch]}</span>
            <span>·</span>
            <span>{chart.wuxingJuName}</span>
          </motion.div>
        </div>

        {/* ─── 右面板 ─── */}
        <div className="chart-workspace-right flex flex-col">
          {/* 格局识别卡片 */}
          <div className="chart-workspace-stickytop flex-shrink-0 p-3" style={{ borderBottom: '1px solid var(--bdr)' }}>
            <div
              className="rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--bdr)',
                boxShadow: 'var(--sh-xs)',
              }}
            >
              <button
                onClick={() => setPatternsOpen(!patternsOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'var(--tx-0)' }}>
                    格局识别
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--tx-3)' }}>
                    · 严格古书条件
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {detectedPatterns.length > 0 && (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ac)' }}>
                      {detectedPatterns.slice(0, 2).map(p => p.name).join('、')}
                      {detectedPatterns.length > 2 && ` 等${detectedPatterns.length}个`}
                    </span>
                  )}
                  <span className="text-[10px] transition-transform duration-200" style={{ transform: patternsOpen ? 'rotate(180deg)' : 'none', color: 'var(--tx-3)' }}>
                    ▼
                  </span>
                </div>
              </button>

              {patternsOpen && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {detectedPatterns.map(p => (
                      <span
                        key={p.name}
                        className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr)', color: 'var(--tx-2)' }}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-[9px] leading-relaxed" style={{ color: 'var(--tx-3)' }}>
                    根据命宫及三方四正星曜组合，自动识别命盘格局。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 命理解读面板 */}
          <div className="chart-workspace-insight flex-1 min-h-0">
            <InsightPanel
              chart={chart}
              selectedPalace={selectedPalace}
              selectedSiHua={selectedSiHua}
            />
          </div>
        </div>

      </div>

      {/* ─── 分享弹窗 ─── */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-sm"
              style={{ background: 'var(--bg-card)', boxShadow: 'var(--sh-lg)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold" style={{ color: 'var(--tx-0)' }}>分享命盘</h3>
                <button onClick={() => setShareOpen(false)} className="text-lg" style={{ color: 'var(--tx-3)' }}>×</button>
              </div>

              <div className="space-y-3">
                {/* 一键分享（Web Share API） */}
                <button
                  onClick={async () => {
                    const url = window.location.href;
                    const title = '紫微斗数命盘';
                    const text = `来看看我的紫微斗数命盘 —— ${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日`;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title, text, url });
                      } catch { /* user cancelled */ }
                    } else {
                      // Fallback: copy link
                      await navigator.clipboard.writeText(`${text}\n${url}`);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }
                    setShareOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors active:scale-[0.98]"
                  style={{ background: '#07C160', color: '#fff' }}
                >
                  <span className="text-xl">💬</span>
                  <div className="text-left flex-1">
                    <div className="text-[14px] font-semibold">分享到微信</div>
                    <div className="text-[12px]" style={{ opacity: 0.85 }}>选择微信好友或朋友圈</div>
                  </div>
                </button>

                {/* 复制链接 */}
                <button
                  onClick={async () => {
                    const url = window.location.href;
                    const text = `来看看我的紫微斗数命盘 —— ${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日`;
                    await navigator.clipboard.writeText(`${text}\n${url}`);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors active:scale-[0.98]"
                  style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
                >
                  <span className="text-lg">🔗</span>
                  <div className="text-left flex-1">
                    <div className="text-[13px] font-medium" style={{ color: 'var(--tx-0)' }}>
                      {copySuccess ? '✓ 已复制链接' : '复制链接'}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                      {copySuccess ? '可粘贴发送给好友' : '手动粘贴发送'}
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-4 text-center text-[10px]" style={{ color: 'var(--tx-3)' }}>
                AI 解读仅供学习参考
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
