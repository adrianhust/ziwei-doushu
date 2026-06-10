import { NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Star {
  name: string;
  type: string;
  siHua?: string;
  brightness?: string;
}

interface Palace {
  name: string;
  branch: number;
  stem: string;
  stars: Star[];
  isMingGong?: boolean;
  isEmpty?: boolean;
  borrowedFromBranch?: number;
  borrowedFromName?: string;
}

interface ChartData {
  birthInfo: {
    year: number;
    month: number;
    day: number;
    hour: number;
    gender: string;
    name?: string;
  };
  palaces: Palace[];
  wuxingJuName?: string;
  mingGongBranch?: number;
  shenGongBranch?: number;
}

function buildStarSect(chart: ChartData): string {
  const sections: string[] = [];
  const mingPalace = chart.palaces.find(p => p.isMingGong);
  const otherPalaces = chart.palaces.filter(p => !p.isMingGong);

  sections.push(`命主性别：${chart.birthInfo.gender === 'male' ? '男' : '女'}`);
  sections.push(`五行局：${chart.wuxingJuName || '未知'}`);
  sections.push(`出生：${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日，${chart.birthInfo.hour}时`);

  if (mingPalace) {
    const stars = mingPalace.stars.map(s =>
      `${s.name}${s.siHua ? `（化${s.siHua}）` : ''}${s.brightness === 'bright' ? '【庙】' : s.brightness === 'dim' ? '【陷】' : ''}`
    ).join('，');
    sections.push(`命宫（${mingPalace.name}）：${stars || '无主星'}`);
  }

  for (const p of otherPalaces) {
    const stars = p.stars.map(s =>
      `${s.name}${s.siHua ? `（化${s.siHua}）` : ''}`
    ).join('，');
    if (stars) {
      sections.push(`${p.name}：${stars}`);
    }
  }

  return sections.join('\n');
}

const MOCK_READINGS: Record<string, string[]> = {
  overview: [
    '### 命格总览\n\n命宫主星显现此命盘格局清晰，命主天性聪颖机敏，具有独立自主的精神内核。',
    '### 性格特质\n\n迁移宫与命宫三合呼应，主星相得益彰，命主不仅内在坚定，外在人际运也十分活跃，得众人扶持。',
    '### 当前大限\n\n当前所处大限为人生关键转折期，官禄宫受到吉化，事业上有突破性发展的契机，宜把握机遇。',
    '### 建议\n\n紫微斗数以"命"为体、"运"为用，命盘已定而运可转。建议命主发挥本命优势，在事业上主动布局，同时关注疾厄宫提示的健康信号，保持身心平衡方为上策。',
  ],
  love: [
    '### 感情格局\n\n夫妻宫星曜配置显示命主感情路上注重精神共鸣，对伴侣的要求较高，宁缺毋滥。',
    '### 夫妻宫分析\n\n夫妻宫主星明亮，配偶能力出众，但煞曜暗伏需注意沟通方式，避免因固执己见导致摩擦。',
    '### 建议\n\n感情之道重在相互成就，命主需学会在坚持与妥协之间找到平衡点，方能缔结良缘。',
  ],
  career: [
    '### 事业格局\n\n官禄宫格局强旺，命主在事业上有卓越的领导潜能与管理才能，适合从事管理、策划或独立创业。',
    '### 三方四正联动\n\n财帛宫与官禄宫形成良性互动，事业成就可有效转化为财富积累，属于名利双收之格局。',
    '### 大限事业运\n\n当前大限正值事业上升期，尤其未来三年是事业发展的黄金窗口，建议大胆行动、积极布局。',
    '### 建议\n\n选择与自己命格五行相合的行业，可事半功倍。同时注意交友宫的影响，合作伙伴的选择至关重要。',
  ],
  wealth: [
    '### 财运格局\n\n财帛宫主星得力，命主财运亨通，正偏财皆有收获，属于多路进财的格局。',
    '### 田宅宫（财库）\n\n田宅宫吉星汇聚，命主不动产运佳，宜在适当时机进行不动产配置，可有效积累财富。',
    '### 当前大限财运\n\n财运走势前平后升，中年后财富积累加速，晚年富足无忧。',
    '### 建议\n\n财虽旺但需防交友宫暗藏的破财信号，与人合作时需明确权责，避免财务纠纷。',
  ],
  health: [
    '### 健康格局\n\n疾厄宫星曜组合提示命主先天体质较好，但需注意因工作压力导致的亚健康状态。',
    '### 主要风险\n\n根据倪海夏子午流注理论，命主需重点关注肝胆系统与消化系统的保养，作息规律至关重要。',
    '### 建议\n\n养生之道顺应天时，建议命主根据节气调整作息，适度运动并结合中医养生之法，可保康泰。',
  ],
  personality: [
    '### 命宫主星性格\n\n命宫主星赋予命主敏锐的洞察力与果断的行动力，为人正直且有领导风范。',
    '### 三方性格综合\n\n迁移宫与官禄宫的星曜进一步强化了命主的外向特质与事业雄心，属于敢作敢当、积极进取的类型。',
    '### 人际关系模式\n\n福德宫暗示命主内心宽厚、待人真诚，因此人缘颇佳。但需注意交友宫提示的识人辨人之道。',
    '### 人生课题\n\n命主的人生课题在于学会放慢脚步、享受当下，避免因过度追求成就而忽略了生活的本质乐趣。',
  ],
};

// ─── AI Provider Implementations ───

async function streamFromDeepSeek(messages: Message[], systemPrompt: string): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
  if (!res.body) throw new Error('No response body');

  return new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                controller.enqueue(encoder.encode(`data: {"delta":{"text":"${escapeJSON(delta)}"}}\n`));
              }
            } catch {}
          }
        }
      }

      controller.enqueue(encoder.encode('data: [DONE]\n'));
      controller.close();
    },
  });
}

async function streamFromAnthropic(messages: Message[], systemPrompt: string): Promise<ReadableStream> {
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const encoder = new TextEncoder();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: true,
  });

  return new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(`data: {"delta":{"text":"${escapeJSON(event.delta.text)}"}}\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n'));
      controller.close();
    },
  });
}

function escapeJSON(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function generateMockStream(chart: ChartData, messages: Message[]): ReadableStream {
  const encoder = new TextEncoder();

  const lastMsg = messages[messages.length - 1]?.content || '';
  let paragraphs: string[] = [];

  if (lastMsg.includes('命格总览') || lastMsg.includes('overview')) {
    paragraphs = MOCK_READINGS.overview;
  } else if (lastMsg.includes('感情')) {
    paragraphs = MOCK_READINGS.love;
  } else if (lastMsg.includes('事业')) {
    paragraphs = MOCK_READINGS.career;
  } else if (lastMsg.includes('财运')) {
    paragraphs = MOCK_READINGS.wealth;
  } else if (lastMsg.includes('健康')) {
    paragraphs = MOCK_READINGS.health;
  } else if (lastMsg.includes('性格')) {
    paragraphs = MOCK_READINGS.personality;
  } else {
    const starSect = buildStarSect(chart);
    paragraphs = [
      `### 命盘综合解读\n\n根据您提供的命盘信息：\n\n${starSect}\n\n此命盘配置格局清晰，主星能量充沛，命主一生运势起伏有致，总体趋向平稳发展。`,
      `### 重点领域\n\n命宫与身宫相互呼应，命主内外一致，为人真诚可信。官禄宫得吉星加持，事业发展顺遂。财帛宫与田宅宫相配，财富积累能力较强。`,
      `### ${chart.birthInfo.name || '命主'}当前运势\n\n当前大限处于人生重要阶段，宜把握时机，积极进取。同时关注健康与家庭平衡，方能行稳致远。`,
    ];
  }

  let index = 0;
  return new ReadableStream({
    async start(controller) {
      for (const para of paragraphs) {
        const words = para.split('');
        for (let i = 0; i < words.length; i += 5) {
          const chunk = words.slice(i, i + 5).join('');
          controller.enqueue(encoder.encode(`data: {"delta":{"text":"${escapeJSON(chunk)}"}}\n`));
          await new Promise(r => setTimeout(r, 20));
        }
        controller.enqueue(encoder.encode(`data: {"delta":{"text":"\\n\\n"}}\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n'));
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  try {
    const { chart, messages }: { chart: ChartData; messages: Message[] } = await request.json();

    if (!chart || !messages) {
      return NextResponse.json({ ok: false, error: '缺少参数' }, { status: 400 });
    }

    const starSect = buildStarSect(chart);
    const systemPrompt = `你是一位精通紫微斗数的大师，传承倪海夏（倪海厦）的紫微斗数体系。你正在为一位用户解读命盘。

用户命盘信息：
${starSect}

解读要求：
1. 使用倪海夏体系的紫微斗数理论进行解读
2. 语言简洁明了，用中文回答
3. 结合星曜特性、宫位属性、四化飞化进行综合分析
4. 给出切实可行的建议
5. 输出格式使用 Markdown，用 ### 作为小标题
6. 每条回复保持 200-500 字

现在请回应用户的请求。`;

    let stream: ReadableStream;

    const provider = process.env.AI_PROVIDER || 'mock';

    try {
      if (provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
        stream = await streamFromDeepSeek(messages, systemPrompt);
      } else if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        stream = await streamFromAnthropic(messages, systemPrompt);
      } else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        const encoder = new TextEncoder();
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
            stream: true,
          }),
        });
        if (!res.ok || !res.body) throw new Error('OpenAI API error');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        stream = new ReadableStream({
          async start(controller) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content || '';
                    if (delta) {
                      controller.enqueue(encoder.encode(`data: {"delta":{"text":"${escapeJSON(delta)}"}}\n`));
                    }
                  } catch {}
                }
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n'));
            controller.close();
          },
        });
      } else {
        stream = generateMockStream(chart, messages);
      }
    } catch {
      stream = generateMockStream(chart, messages);
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Interpret error:', err);
    return NextResponse.json({ ok: false, error: '解读失败' }, { status: 500 });
  }
}
