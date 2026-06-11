'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';
import { useAuth } from '@/components/AuthProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hidden?: boolean;
}

interface SelectedSiHua {
  starName: string;
  siHua: string;
  view: TimeView;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
  selectedSiHua?: SelectedSiHua | null;
}

const TOPICS = [
  { key: 'overview',     label: '命格总览' },
  { key: 'wealth',       label: '财运' },
  { key: 'career',       label: '事业' },
  { key: 'love',         label: '感情' },
  { key: 'personality',  label: '性格' },
  { key: 'health',       label: '健康' },
  { key: 'family',       label: '兄弟合伙' },
  { key: 'children',     label: '子女' },
  { key: 'move',         label: '迁移外出' },
  { key: 'friends',      label: '人际贵人' },
  { key: 'home',         label: '田宅' },
  { key: 'spirit',       label: '福德' },
  { key: 'parents',      label: '父母长辈' },
];

const TOPIC_PROMPTS: Record<string, string> = {
  overview: `请用自然流畅的语言分析此命盘的命格总览。包括：命宫主星的核心特质与格局定性，三方四正（财帛、官禄、迁移）的联动分析，当前大限运势方向，以及命主的天赋优势和需要注意的方面。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  love: `请用自然流畅的语言分析此命盘的感情婚姻运。包括：夫妻宫主星与四化的具体解读，相关宫位对感情的影响，当前大限的感情走向，以及实际可行的建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  career: `请用自然流畅的语言分析此命盘的事业运。包括：官禄宫主星与四化的解读，判断宜任职还是宜创业，财帛宫与事业的联动关系，当前大限的事业走向，以及适合的方向和策略建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  wealth: `请用自然流畅的语言分析此命盘的财运。包括：财帛宫主星与四化的解读，判断是主动财还是被动财，田宅宫的积蓄能力与不动产运势，当前大限的财运走向，以及具体的理财建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  health: `请用自然流畅的语言分析此命盘的健康运势。包括：疾厄宫主星与健康含义，结合倪海夏子午流注理论分析主要健康隐患，当前大限的健康趋势，以及预防建议和养生方向。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  personality: `请用自然流畅的语言深度解析此命盘的性格特质。包括：命宫主星的核心性格，三方宫位对性格的综合影响，人际交往模式，以及天赋优势和人生课题。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  family: `请用自然流畅的语言分析此命盘的兄弟姐妹与合伙运势。包括：兄弟宫主星解读，适合合伙还是单干，合伙人特征，以及实际建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  children: `请用自然流畅的语言分析此命盘的子女缘分。包括：子女宫主星解读，与子女的相处模式，以及实际建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  move: `请用自然流畅的语言分析此命盘的迁移外出运势。包括：迁移宫主星解读，外出机遇，适合在家发展还是外出闯荡，以及实际建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  friends: `请用自然流畅的语言分析此命盘的人际贵人运势。包括：交友宫主星解读，朋友圈特征，贵人来自何方，如何把握贵人运，以及实际建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  home: `请用自然流畅的语言分析此命盘的田宅不动产运势。包括：田宅宫主星解读，不动产运势，适合的居住环境与置业时机，以及实际建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  spirit: `请用自然流畅的语言分析此命盘的精神福德运势。包括：福德宫主星解读，内心追求与精神满足，以及实际建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,

  parents: `请用自然流畅的语言分析此命盘的父母长辈运势。包括：父母宫主星解读，与父母关系，文书契约相关的运势，以及实际建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`,
};

const PALACE_ROLES: Record<string, string> = {
  '命宫':   '自我、性格、先天格局',
  '兄弟宫': '兄弟关系、合伙人',
  '夫妻宫': '感情关系、婚姻状态',
  '子女宫': '子女缘分、下属关系',
  '财帛宫': '财运来源、收入方式',
  '疾厄宫': '身体健康、意外',
  '迁移宫': '外出机遇、人际格局',
  '交友宫': '朋友圈、贵人、小人',
  '官禄宫': '事业成就、社会地位',
  '田宅宫': '不动产、家庭环境',
  '福德宫': '精神享受、内心福分',
  '父母宫': '父母关系、文书契约',
};

function AiContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // ### heading format
        const h3Match = line.match(/^### (.+)$/);
        if (h3Match) {
          return (
            <div key={i} className="pt-4 pb-1 first:pt-0">
              <span className="text-[15px] font-bold" style={{ color: 'var(--tx-0)' }}>
                {h3Match[1]}
              </span>
            </div>
          );
        }
        // **【Title】** format (legacy)
        const sectionMatch = line.match(/^\*\*【(.+?)】\*\*$/);
        if (sectionMatch) {
          return (
            <div key={i} className="pt-4 pb-1 first:pt-0">
              <span className="text-[15px] font-bold" style={{ color: 'var(--tx-0)' }}>
                【{sectionMatch[1]}】
              </span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-2" />;
        // Split by **bold** and ==highlight==
        const parts = line.split(/(\*\*(.+?)\*\*|==(.+?)==)/);
        return (
          <div key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--tx-2)' }}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const inner = part.slice(2, -2);
                return <strong key={j} className="font-medium" style={{ color: 'var(--tx-1)' }}>{inner}</strong>;
              }
              if (part.startsWith('==') && part.endsWith('==')) {
                const inner = part.slice(2, -2);
                return <mark key={j} className="px-1 rounded" style={{ background: 'var(--ac-bg)', color: 'var(--ac)', fontWeight: 500 }}>{inner}</mark>;
              }
              return part;
            })}
          </div>
        );
      })}
      {streaming && (
        <span
          className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm align-middle"
          style={{ background: 'var(--ac)', opacity: 0.6 }}
        />
      )}
    </div>
  );
}

export default function InsightPanel({ chart, selectedPalace, selectedSiHua }: InsightPanelProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  const loadingRef = useRef(false);
  const autoLoaded = useRef(false);
  const lastPalaceBranch = useRef<number | undefined>(undefined);
  const lastSiHuaKey = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    sendMessage(TOPIC_PROMPTS.overview, true);
  }, []);

  useEffect(() => {
    if (!selectedPalace || selectedPalace.branch === lastPalaceBranch.current) return;
    lastPalaceBranch.current = selectedPalace.branch;

    const majorStars = selectedPalace.stars.filter(s => s.type === 'major');
    const starDesc = majorStars.length > 0
      ? majorStars.map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、')
      : '空宫（借对宫）';
    const role = PALACE_ROLES[selectedPalace.name] ?? '';

    const prompt = `请用自然流畅的语言重点分析【${selectedPalace.name}】（主管：${role}），该宫主星为${starDesc}。包括：该宫在命盘中的意义与整体判断，主星在此宫的解读，三方四正宫位的影响，以及具体建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`;

    sendMessage(prompt, true);
  }, [selectedPalace]);

  useEffect(() => {
    if (!selectedSiHua) return;
    const key = `${selectedSiHua.starName}-${selectedSiHua.siHua}-${selectedSiHua.view}`;
    if (key === lastSiHuaKey.current) return;
    lastSiHuaKey.current = key;

    const palaceOfStar = chart.palaces.find(p =>
      p.stars.some(s => s.name === selectedSiHua.starName)
    );
    const palaceName = palaceOfStar?.name ?? '未知宫位';
    const viewLabel = selectedSiHua.view === 'daxian' ? '大限' : '流年';

    const prompt = `请用自然流畅的语言分析【${viewLabel}${selectedSiHua.starName}化${selectedSiHua.siHua}】的飞化影响。包括：化${selectedSiHua.siHua}在倪海夏体系中的核心含义，${selectedSiHua.starName}化${selectedSiHua.siHua}落在【${palaceName}】的影响，对其三方四正的联动，当前运势中的具体影响，以及可操作的建议。请用 ### 作为段落标题，用 ==高亮== 标记核心关键词和重要结论，语言流畅自然。`;

    sendMessage(prompt, true);
  }, [selectedSiHua]);

  const streamResponse = async (apiMessages: { role: 'user' | 'assistant'; content: string }[]) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers,
        body: JSON.stringify({ chart, messages: apiMessages }),
      });
      if (!res.ok) throw new Error('请求失败');
      if (!res.body) throw new Error('无响应流');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const delta = JSON.parse(data).delta?.text ?? '';
            assistantText += delta;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantText };
              return updated;
            });
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '解读失败，请稍后重试。' }]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const sendMessage = (text: string, hidden = false) => {
    if (!text.trim() || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const userMsg: Message = { role: 'user', content: text, hidden };
    const apiMessages = [...messagesRef.current, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    streamResponse(apiMessages);
  };

  const handleTopicClick = (topicKey: string) => {
    if (loadingRef.current) return;
    setActiveTopic(topicKey);
    sendMessage(TOPIC_PROMPTS[topicKey], true);
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleDownload = () => {
    const content = messages
      .filter(m => m.role === 'assistant' && m.content)
      .map(m => m.content)
      .join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `命盘分析_${chart.birthInfo.year}${chart.birthInfo.month}${chart.birthInfo.day}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr)' }}>

      {/* Topic buttons */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2" style={{ borderBottom: '1px solid var(--bdr)' }}>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map(t => {
            const isActive = activeTopic === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTopicClick(t.key)}
                disabled={loading}
                className="px-3 py-1.5 text-[13px] font-medium rounded-full transition-all duration-150 disabled:opacity-40"
                style={{
                  background: isActive ? 'var(--tx-0)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--tx-0)' : 'var(--bdr)'}`,
                  color: isActive ? 'var(--bg-0)' : 'var(--tx-2)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-full font-medium transition-colors"
            style={{ background: 'var(--tx-0)', color: 'var(--bg-0)' }}
          >
            ↓ 下载全盘报告
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[10px] font-medium"
            style={{ color: 'var(--tx-3)' }}
          >
            收起分析 {collapsed ? '▾' : '▴'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {!collapsed && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3" style={{ color: 'var(--ac)', opacity: 0.1 }}>✦</div>
              <p className="text-[10px] animate-pulse" style={{ color: 'var(--tx-3)' }}>命格解读生成中…</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              if (msg.role === 'user' && msg.hidden) return null;

              if (msg.role === 'user') {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div
                      className="max-w-[85%] rounded-xl px-3 py-2 text-[11px]"
                      style={{
                        background: 'var(--ac-bg)',
                        border: '1px solid var(--ac-bdr)',
                        color: 'var(--ac)',
                      }}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                );
              }

              const isLastMsg = i === messages.length - 1;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className="text-[9px] tracking-widest mb-2 flex items-center gap-1.5"
                    style={{ color: 'var(--tx-3)' }}
                  >
                    <span style={{ color: 'var(--ac)', opacity: 0.4 }}>✦</span>
                    命理解读
                  </div>
                  <AiContent text={msg.content} streaming={loading && isLastMsg} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2" style={{ borderTop: collapsed ? 'none' : '1px solid var(--bdr)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="继续追问，如：今年适合换工作吗？"
            disabled={loading}
            className="flex-1 rounded-lg px-3 py-2 text-[13px] focus:outline-none transition-colors"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--bdr-med)',
              color: 'var(--tx-1)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'var(--ac-bg)',
              border: '1px solid var(--ac-bdr)',
              color: 'var(--ac)',
            }}
          >
            {loading ? '…' : '追问'}
          </button>
        </div>
      </div>

      {/* AI Disclaimer */}
      <div className="flex-shrink-0 px-3 pb-2 text-center">
        <div className="text-[8px]" style={{ color: 'var(--tx-3)', opacity: 0.6 }}>
          AI 解读仅供学习参考，不构成医疗、投资、婚姻或法律建议
        </div>
      </div>
    </div>
  );
}
