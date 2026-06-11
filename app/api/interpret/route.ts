import { NextResponse } from 'next/server';
import { getSessionByToken, getUserById } from '@/lib/auth/store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
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

function starList(stars: Star[]): string {
  if (!stars.length) return '无主星';
  return stars.map(s =>
    `${s.name}${s.siHua ? `（化${s.siHua}）` : ''}${s.brightness === 'bright' ? '【庙】' : s.brightness === 'dim' ? '【陷】' : ''}`
  ).join('、');
}

function buildMockReadings(chart: ChartData, topic: string): string[] {
  const ming = chart.palaces.find(p => p.isMingGong);
  const mingStars = ming ? starList(ming.stars.filter(s => s.type === 'major')) : '未知';
  const mingAll = ming ? starList(ming.stars) : '未知';

  const findPalace = (name: string) => chart.palaces.find(p => p.name === name);
  // iztro returns names without "宫" suffix (e.g. "财帛" not "财帛宫", "仆役" not "交友宫")
  const luck = findPalace('财帛');
  const career = findPalace('官禄');
  const move = findPalace('迁移');
  const love = findPalace('夫妻');
  const health = findPalace('疾厄');
  const land = findPalace('田宅');
  const spirit = findPalace('福德');
  const sibling = findPalace('兄弟');
  const children = findPalace('子女');
  const friends = findPalace('仆役');
  const parents = findPalace('父母');

  const gender = chart.birthInfo.gender === 'male' ? '男' : '女';
  const hourStr = `${chart.birthInfo.hour}时`;

  switch (topic) {
    case 'overview':
      return [
        `### 命格总览\n\n命主为${gender}命，生于${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日${hourStr}，五行${chart.wuxingJuName || '未知'}。命宫主星为【${mingStars}】，格局${ming?.isEmpty ? '空宫借对宫安星' : '主星显现'}。命主天性${mingStars.includes('紫微') ? '稳重威严、有领袖风范' : mingStars.includes('天机') ? '聪慧机敏、善于筹谋' : mingStars.includes('太阳') ? '热情大方、光明磊落' : mingStars.includes('武曲') ? '刚毅果决、执行力强' : mingStars.includes('天同') ? '温和善良、人缘极佳' : mingStars.includes('廉贞') ? '才华横溢、情感丰富' : mingStars.includes('天府') ? '稳重保守、理财有道' : mingStars.includes('太阴') ? '细腻温柔、感受力强' : mingStars.includes('贪狼') ? '多才多艺、社交活跃' : mingStars.includes('巨门') ? '口才出众、思辨敏锐' : mingStars.includes('天相') ? '正直守法、善于协调' : mingStars.includes('天梁') ? '老成持重、慈悲为怀' : mingStars.includes('七杀') ? '刚烈勇敢、敢于开创' : mingStars.includes('破军') ? '勇于突破、不畏变动' : '聪颖机敏'}。`,
        `### 三方四正\n\n${move ? `迁移宫【${starList(move.stars.filter(s => s.type === 'major'))}】显示命主${move.stars.some(s => s.type === 'major') ? '外出发展机遇良好，人际关系活跃' : '外出运较为平淡，宜深耕本地'}。` : ''}${career ? `官禄宫【${starList(career.stars.filter(s => s.type === 'major'))}】提示事业${career.stars.some(s => s.type === 'major') ? '方向明确，有发展潜力' : '需多方尝试，寻找方向'}。` : ''}${luck ? `财帛宫【${starList(luck.stars.filter(s => s.type === 'major'))}】显示财运${luck.stars.some(s => s.type === 'major') ? '来源稳定，善于理财' : '波动较大，需谨慎规划'}。` : ''}`,
        `### 当前大限\n\n${chart.birthInfo.name || '命主'}当前处于人生重要阶段，大限宫位与命盘格局相互呼应，宜把握本命优势，积极布局未来发展。`,
        `### 建议\n\n紫微斗数以"命"为体、"运"为用，命盘已定而运可转。建议命主发挥本命主星${mingStars}的天赋优势，在事业上主动布局，同时关注身体健康，保持身心平衡方为上策。`,
      ];

    case 'love':
      return [
        `### 感情格局\n\n夫妻宫${love ? `主星为【${starList(love.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，显示命主在感情上${love?.stars.some(s => s.name === '贪狼') ? '注重浪漫与激情，桃花运较旺' : love?.stars.some(s => s.name === '天同') ? '温和体贴，追求安稳的感情生活' : love?.stars.some(s => s.name === '太阴') ? '细腻敏感，对感情要求高' : love?.stars.some(s => s.name === '太阳') ? '开朗大方，感情主动积极' : love?.stars.some(s => s.name === '紫微') ? '较为强势，希望掌握主导权' : love?.stars.some(s => s.name === '天机') ? '思虑较多，容易犹豫不决' : '注重精神共鸣，宁缺毋滥'}。`,
        `### 夫妻宫分析\n\n${love ? `夫妻宫${starList(love.stars)}，` : ''}${move ? `迁移宫【${starList(move.stars.filter(s => s.type === 'major'))}】作为夫妻宫的三方四正之一，对感情运势亦有影响。` : ''}配偶${love?.stars.some(s => s.type === 'major') ? '个性鲜明，能力出众' : '性格温和'}，需注意沟通方式，相互包容方能长久。`,
        `### 建议\n\n${love?.stars.some(s => s.name === '贪狼') ? '感情中需保持专一，避免因桃花过旺而影响稳定关系，学会经营长久的感情比追求新鲜感更重要。' : love?.stars.some(s => s.name === '天同') ? '命主在感情中宜主动表达自己的想法，避免因过于随和而委屈自己，真诚沟通是维系感情的关键。' : love?.stars.some(s => s.name === '太阴') ? '在感情中需学会放下过度敏感，给予伴侣更多的信任与空间，情感交流宜直接坦率。' : love?.stars.some(s => s.name === '太阳') ? '命主在感情中宜多关注伴侣的感受，避免因过于热心外界而忽略身边人的情感需求。' : love?.stars.some(s => s.name === '紫微') ? '感情中需学会放下身段，适当示弱反而能增进亲密关系，尊重伴侣的独立性。' : love?.stars.some(s => s.name === '天机') ? '命主在感情中宜减少思虑过多，信任直觉与缘分，避免因反复权衡而错失良缘。' : love?.stars.some(s => s.name === '武曲') ? '感情中需注重柔情表达，避免因过于理性刚硬而让伴侣感到疏离，学会适时柔软。' : love?.stars.some(s => s.name === '天府') ? '命主在感情中宜主动付出，避免过于保守被动，感情需要经营与投入方能长久。' : love?.stars.some(s => s.name === '廉贞') ? '感情中需平衡理性与感性，避免因情感过于丰富而产生不必要的情结纠葛。' : love?.stars.some(s => s.name === '巨门') ? '命主在感情中需注意沟通方式，避免因言辞锋利而伤害伴侣，学会婉转表达。' : love?.stars.some(s => s.name === '天相') ? '感情中需学会拒绝与设立边界，避免因过于迁就而失去自我，平等相待方为健康关系。' : love?.stars.some(s => s.name === '天梁') ? '命主在感情中宜放松心态，避免过于操心或扮演拯救者角色，享受平等的伴侣关系。' : love?.stars.some(s => s.name === '七杀') ? '感情中需学会控制情绪，避免因冲动而做出令自己后悔的决定，冷静沟通为上策。' : love?.stars.some(s => s.name === '破军') ? '命主在感情中需寻求稳定性，避免因频繁变动而让伴侣缺乏安全感，沉淀下来方能收获真心。' : '感情之道重在相互成就，命主需学会在坚持与妥协之间找到平衡点，方能缔结良缘。'}`,
      ];

    case 'career':
      return [
        `### 事业格局\n\n官禄宫${career ? `主星【${starList(career.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主在事业上${career?.stars.some(s => s.name === '紫微') ? '有卓越的领导才能，适合管理岗位' : career?.stars.some(s => s.name === '天府') ? '稳重可靠，适合行政管理' : career?.stars.some(s => s.name === '太阳') ? '适合公职或需要公众形象的职业' : career?.stars.some(s => s.name === '武曲') ? '适合财务、金融、军警行业' : career?.stars.some(s => s.name === '天机') ? '适合策划、咨询、技术类工作' : career?.stars.some(s => s.name === '天相') ? '适合幕僚、行政、法律类工作' : career?.stars.some(s => s.name === '七杀' || s.name === '破军' || s.name === '贪狼') ? '适合创业、竞争性强的行业' : '发展空间较大，需找准方向'}。`,
        `### 三方四正联动\n\n${luck ? `财帛宫【${starList(luck.stars.filter(s => s.type === 'major'))}】与官禄宫形成${luck.stars.some(s => s.type === 'major') ? '良性互动，事业成就可有效转化为财富积累' : '互动较弱，需注意财务管理'}。` : ''}${ming ? `命宫主星【${mingStars}】为事业格局提供内在驱动力。` : ''}`,
        `### 大限事业运\n\n当前大限是事业发展的关键时期，建议命主积极行动、主动布局，把握机遇。`,
        `### 建议\n\n选择与自身命格五行${chart.wuxingJuName || ''}相合的行业，可事半功倍。同时注意人际关系的经营，合作伙伴的选择至关重要。`,
      ];

    case 'wealth':
      return [
        `### 财运格局\n\n财帛宫${luck ? `主星【${starList(luck.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主财运${luck?.stars.some(s => s.type === 'major') ? '较为亨通，正偏财皆有收获' : '波动较大，需稳健理财'}。`,
        `### 田宅宫（财库）\n\n田宅宫${land ? `主星【${starList(land.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，${land?.stars.some(s => s.type === 'major') ? '不动产运佳，宜在适当时机进行资产配置' : '不动产运平淡，需谨慎投资'}。`,
        `### 当前大限运势\n\n当前大限的财运走势需结合大限宫位综合判断，建议量入为出、稳健投资。`,
        `### 建议\n\n财需开源亦需节流，与人合作时需明确权责，避免财务纠纷。`,
      ];

    case 'health':
      return [
        `### 健康格局\n\n疾厄宫${health ? `星曜组合【${starList(health.stars)}】` : '未见明显星曜'}，提示命主先天体质${health?.stars.length ? '需要关注特定健康领域' : '总体较好'}。`,
        `### 主要风险\n\n根据倪海夏子午流注理论，命主需重点关注${health?.stars.some(s => s.name === '巨门' || s.name === '天机') ? '消化系统与神经系统' : health?.stars.some(s => s.name === '太阳' || s.name === '廉贞') ? '心血管与眼睛保养' : health?.stars.some(s => s.name === '太阴' || s.name === '天同') ? '内分泌与免疫系统' : health?.stars.some(s => s.name === '武曲' || s.name === '七杀') ? '呼吸系统与骨骼关节' : health?.stars.some(s => s.name === '天府' || s.name === '天相') ? '脾胃消化系统' : health?.stars.some(s => s.type === 'sha') ? '意外伤害与突发疾病' : '肝胆系统与消化系统'}的保养，作息规律至关重要。`,
        `### 建议\n\n养生之道顺应天时，建议命主根据节气调整作息，适度运动并结合中医养生之法，可保康泰。`,
      ];

    case 'personality':
      return [
        `### 命宫主星性格\n\n命宫主星【${mingStars}】赋予命主${mingStars.includes('紫微') ? '稳重威严的气质与领导风范，好面子、重尊严' : mingStars.includes('天机') ? '敏锐的洞察力与灵活的思维，善变、适应力强' : mingStars.includes('太阳') ? '热情开朗的个性与慷慨大方的胸襟' : mingStars.includes('武曲') ? '刚毅果决的性格与强大的执行力' : mingStars.includes('天同') ? '温和善良的性情与随和的人生态度' : mingStars.includes('廉贞') ? '出众的才华与丰富的情感世界' : mingStars.includes('天府') ? '稳重保守的作风与优秀的理财能力' : mingStars.includes('太阴') ? '细腻温柔的性格与丰富的感受力' : mingStars.includes('贪狼') ? '多才多艺的禀赋与活跃的社交能力' : mingStars.includes('巨门') ? '出色的口才与深入思考的能力' : mingStars.includes('天相') ? '正直守法的品格与优秀的协调能力' : mingStars.includes('天梁') ? '老成持重的气质与慈悲为怀的心肠' : mingStars.includes('七杀') ? '刚烈勇敢的性格与强大的开创力' : mingStars.includes('破军') ? '勇于突破的精神与不畏变革的胆识' : '独特的个性魅力'}。`,
        `### 三方综合\n\n${move ? `迁移宫【${starList(move.stars.filter(s => s.type === 'major'))}】塑造了命主外在形象与人际风格。` : ''}${career ? `官禄宫【${starList(career.stars.filter(s => s.type === 'major'))}】反映了命主的事业性格与工作态度。` : ''}${ming?.isEmpty ? '命宫空宫借对宫安星，性格中有迁移宫的影子。' : ''}`,
        `### 人际关系模式\n\n${spirit ? `福德宫【${starList(spirit.stars.filter(s => s.type === 'major'))}】暗示命主${spirit.stars.some(s => s.type === 'major') ? '内心充实、精神世界丰富' : '内心追求安宁与平和'}。` : ''}命主在人际交往中${['紫微', '天府'].some(s => mingStars.includes(s)) ? '较为主动，喜欢掌控局面' : ['天机', '太阴'].some(s => mingStars.includes(s)) ? '较为含蓄，心思细腻' : ['太阳', '贪狼', '廉贞'].some(s => mingStars.includes(s)) ? '热情外向，容易结交朋友' : ['武曲', '七杀'].some(s => mingStars.includes(s)) ? '直接坦率，但不失真诚' : '真诚友善'}。`,
        `### 人生课题\n\n命主的人生课题在于${mingStars.includes('紫微') ? '学会放权与信任他人' : mingStars.includes('天机') ? '坚定选择、减少犹豫' : mingStars.includes('太阳') ? '学会照顾自己、不过度付出' : ['武曲', '七杀', '破军'].some(s => mingStars.includes(s)) ? '学会柔软与妥协' : ['天同', '天府'].some(s => mingStars.includes(s)) ? '突破舒适区、主动求变' : ['太阴', '天梁'].some(s => mingStars.includes(s)) ? '增强自信、减少顾虑' : mingStars.includes('贪狼') ? '专注深耕、避免贪多' : mingStars.includes('巨门') ? '以柔克刚、化口才为智慧' : mingStars.includes('天相') ? '学会拒绝、守住底线' : mingStars.includes('廉贞') ? '平衡理性与感性' : '认识自我、发挥优势'}，方能活出更精彩的人生。`,
      ];

    case 'family':
      return [
        `### 兄弟姐妹与合伙格局\n\n兄弟宫${sibling ? `主星为【${starList(sibling.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主${sibling?.stars.some(s => s.type === 'major') ? '兄弟姐妹缘分较好，适合与他人合作共事' : '与兄弟姐妹缘份较淡，适合独立发展'}。`,
        `### 合伙分析\n\n${sibling ? `兄弟宫${starList(sibling.stars)}，` : ''}${sibling?.stars.some(s => s.type === 'major') ? '合伙运势较好，可考虑与信任之人共同创业' : '合伙需谨慎，建议独立经营或与配偶合作'}，需注意权责分明。`,
        `### 建议\n\n合伙之道重在诚信与分工明确，命主需在选择合作伙伴时多加考量，方能合作共赢。`,
      ];

    case 'children':
      return [
        `### 子女缘分\n\n子女宫${children ? `主星为【${starList(children.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，显示命主${children?.stars.some(s => s.type === 'major') ? '与子女缘分深厚，子女聪慧有出息' : '子女缘份较淡，需多加培养感情'}。`,
        `### 子女宫分析\n\n${children ? `子女宫${starList(children.stars)}，` : ''}${children?.stars.some(s => s.name === '太阳') ? '子女个性活泼开朗，有领导才能' : children?.stars.some(s => s.name === '太阴') ? '子女温柔懂事，心思细腻' : children?.stars.some(s => s.name === '天同') ? '子女性格温和，孝顺听话' : children?.stars.some(s => s.name === '武曲') ? '子女刚强独立，有不凡之志' : children?.stars.some(s => s.name === '天府') ? '子女稳重可靠，有福气' : children?.stars.some(s => s.name === '贪狼') ? '子女多才多艺，但需注意管教' : children?.stars.some(s => s.name === '紫微') ? '子女有领导风范，自尊心强' : children?.stars.some(s => s.name === '天机') ? '子女聪明伶俐，学习能力强' : children?.stars.some(s => s.name === '巨门') ? '子女口才好，需注意沟通引导' : children?.stars.some(s => s.name === '廉贞') ? '子女情感丰富，有艺术天赋' : children?.stars.some(s => s.name === '七杀' || s.name === '破军') ? '子女个性强烈，需耐心教导' : '子女有各自的发展道路'}。`,
        `### 建议\n\n教育之道贵在因材施教，命主需根据子女的天性加以引导，给予充分的成长空间。`,
      ];

    case 'move':
      return [
        `### 迁移外出运势\n\n迁移宫${move ? `主星为【${starList(move.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主${move?.stars.some(s => s.type === 'major') ? '外出发展机遇良好，适合异地发展' : '外出运势较为平淡，宜深耕本地'}。`,
        `### 外出机遇\n\n${move ? `迁移宫${starList(move.stars)}，` : ''}${move?.stars.some(s => s.name === '紫微' || s.name === '天府') ? '在外有贵人相助，适合在异地建立事业' : move?.stars.some(s => s.name === '天机') ? '适合在外从事脑力工作，异地反而更有利' : move?.stars.some(s => s.name === '太阳') ? '在外人缘好，适合出国或远地发展' : move?.stars.some(s => s.name === '贪狼' || s.name === '破军') ? '适合国际业务或频繁出差的行业' : move?.stars.some(s => s.name === '天同') ? '外出生活安逸，可得友人照应' : move?.stars.some(s => s.name === '武曲') ? '在外有开创精神，适合异地创业' : '外出时需注意安全与人际交往'}。`,
        `### 建议\n\n${move?.stars.some(s => s.type === 'major') ? '命主迁移运佳，宜大胆走出去开拓视野，海外或异地发展机会多' : '建议命主先在本土深耕，待时机成熟再考虑向外发展'}。`,
      ];

    case 'friends':
      return [
        `### 人际关系与贵人运\n\n交友宫${friends ? `主星为【${starList(friends.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主${friends?.stars.some(s => s.type === 'major') ? '人脉广阔，社交活跃，贵人运佳' : '人际关系较为平淡，宜以诚待人'}。`,
        `### 朋友圈特征\n\n${friends ? `交友宫${starList(friends.stars)}，` : ''}${friends?.stars.some(s => s.name === '紫微' || s.name === '天府') ? '结交的朋友多有权贵之人，朋友圈层次较高' : friends?.stars.some(s => s.name === '天机' || s.name === '巨门') ? '朋友以智谋型人才为主，多交流可获益' : friends?.stars.some(s => s.name === '太阳' || s.name === '天同') ? '朋友热心真诚，遇困难时可得援手' : friends?.stars.some(s => s.name === '贪狼' || s.name === '廉贞') ? '社交广泛，朋友来自各行各业' : friends?.stars.some(s => s.name === '武曲' || s.name === '七杀') ? '朋友多性格刚强，彼此激励成长' : friends?.stars.some(s => s.type === 'sha') ? '交友需谨慎，谨防小人' : '朋友贵在真诚，不在于数量'}。`,
        `### 建议\n\n命主在人际交往中宜真诚待人、广结善缘，关键时刻自有贵人相助。`,
      ];

    case 'home':
      return [
        `### 田宅运势\n\n田宅宫${land ? `主星为【${starList(land.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主${land?.stars.some(s => s.type === 'major') ? '不动产运佳，适合投资房产' : '不动产运较为平淡，不宜激进投资'}。`,
        `### 居住环境\n\n${land ? `田宅宫${starList(land.stars)}，` : ''}${land?.stars.some(s => s.name === '紫微' || s.name === '天府') ? '适合居住在环境优雅的高档社区' : land?.stars.some(s => s.name === '太阴') ? '适合临水或环境清幽的住所' : land?.stars.some(s => s.name === '天同' || s.name === '天相') ? '适合住在生活便利的市区' : land?.stars.some(s => s.name === '武曲' || s.name === '七杀') ? '适合靠近商业区或交通便利的地段' : land?.stars.some(s => s.name === '贪狼' || s.name === '破军') ? '房屋易有变动，宜租不宜买' : land?.stars.some(s => s.name === '天机') ? '适合环境安静、适合思考的居所' : '选择安静舒适的居住环境即可'}。`,
        `### 建议\n\n${land?.stars.some(s => s.type === 'major') ? '可关注不动产投资机会，中长期持有有望增值' : '理财以稳健为主，不宜过度配置不动产'}。`,
      ];

    case 'spirit':
      return [
        `### 福德精神运势\n\n福德宫${spirit ? `主星为【${starList(spirit.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主${spirit?.stars.some(s => s.type === 'major') ? '内心充实，精神世界丰富，懂得享受生活' : '内心追求安宁与平和，不喜纷争'}。`,
        `### 精神世界\n\n${spirit ? `福德宫${starList(spirit.stars)}，` : ''}${spirit?.stars.some(s => s.name === '天同' || s.name === '太阴') ? '性格温和，注重精神享受，有艺术天赋' : spirit?.stars.some(s => s.name === '紫微' || s.name === '天府') ? '内心高贵，追求有品质的生活' : spirit?.stars.some(s => s.name === '天机') ? '思维活跃，喜欢学习和思考' : spirit?.stars.some(s => s.name === '太阳') ? '心胸开阔，乐观积极' : spirit?.stars.some(s => s.name === '贪狼' || s.name === '廉贞') ? '内心丰富，有独特的审美和品味' : spirit?.stars.some(s => s.name === '武曲' || s.name === '七杀') ? '意志坚定，有不服输的精神' : spirit?.stars.some(s => s.type === 'sha') ? '内心易有压力，需学会放松' : '内心平和，知足常乐'}。`,
        `### 建议\n\n培养一项修身养性的爱好，有助于提升生活品质与内心幸福感。`,
      ];

    case 'parents':
      return [
        `### 父母长辈运势\n\n父母宫${parents ? `主星为【${starList(parents.stars.filter(s => s.type === 'major'))}】` : '未见明显主星'}，命主与父母${parents?.stars.some(s => s.type === 'major') ? '缘分深厚，能得到父母的关爱与支持' : '关系较为平淡，需主动维系亲情'}。`,
        `### 父母宫分析\n\n${parents ? `父母宫${starList(parents.stars)}，` : ''}${parents?.stars.some(s => s.name === '紫微' || s.name === '天府') ? '父母社会地位较高，对命主有正面影响' : parents?.stars.some(s => s.name === '太阳') ? '父亲对命主影响较大，为人正直开明' : parents?.stars.some(s => s.name === '太阴') ? '母亲对命主影响深远，温柔慈爱' : parents?.stars.some(s => s.name === '武曲') ? '父母性格刚强，对命主要求严格' : parents?.stars.some(s => s.name === '天同' || s.name === '天相') ? '父母温和慈祥，家庭氛围融洽' : parents?.stars.some(s => s.name === '巨门') ? '与父母间沟通需注意方式' : parents?.stars.some(s => s.name === '天机') ? '父母思维活跃，注重教育' : parents?.stars.some(s => s.name === '贪狼' || s.name === '破军') ? '父母经历丰富，对命主管教较开放' : '与父母相处和谐'}。`,
        `### 建议\n\n孝顺父母、尊敬长辈是人生福报之根基，建议多抽时间陪伴家人。`,
      ];

    default:
      return [];
  }
}

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

function getUserVariant(currentUser: { name: string; phone: string; id: string } | null) {
  if (!currentUser) return 0;
  const sum = currentUser.phone.split('').reduce((acc, ch) => acc + Number(ch || 0), 0);
  return sum % 4;
}

function getVariantAdvice(variant: number) {
  const variants = [
    {
      label: '稳健布局',
      career: '建议以稳健布局为主，先夯实基础，再逐步扩展事业范围。',
      wealth: '财富策略宜守成为主，稳健理财比短期投机更符合当前局势。',
    },
    {
      label: '突破进取',
      career: '此用户适合把握机遇，适度争取突破性的事业机会。',
      wealth: '财运上可适当关注新兴机会，但需做好风险控制。',
    },
    {
      label: '人脉协同',
      career: '建议通过人脉协同与合作关系推动事业发展。',
      wealth: '财运方面宜借助贵人和合作伙伴的支持，避免孤军深入。',
    },
    {
      label: '稳中求变',
      career: '建议在稳中求变中寻找突破口，避免急躁冒进。',
      wealth: '财富策略宜分散配置，既保守又保留一定增值空间。',
    },
  ];
  return variants[variant];
}

function generateMockStream(chart: ChartData, messages: Message[], currentUser: { name: string; phone: string; id: string } | null): ReadableStream {
  const encoder = new TextEncoder();
  const variant = getUserVariant(currentUser);
  const variantAdvice = getVariantAdvice(variant);

  const userNote = currentUser
    ? `### 个性化提示\n\n本次解读针对用户【${currentUser.name}】，报告建议会结合其身份特征与偏好方向。\n\n`
    : '';

  const styleHint = currentUser
    ? `### 用户风格\n\n该用户偏好${currentUser.name.length % 2 === 0 ? '稳健踏实' : '积极活跃'}的表达方式，建议内容将更强调${currentUser.name.length % 2 === 0 ? '长线规划与情绪管理' : '行动力与突破机遇'}。\n\n`
    : '';

  const extraUserHint = currentUser
    ? `### 用户专属建议\n\n针对用户【${currentUser.name}】，本次解读将特别关注${variantAdvice.label}风格，建议内容更契合其当前能量。\n\n`
    : '';

  const lastMsg = messages[messages.length - 1]?.content || '';
  let paragraphs: string[] = [];

  const wrapWithHints = (base: string[]) => currentUser ? [userNote, styleHint, extraUserHint, ...base] : base;

  if (lastMsg.includes('命格总览') || lastMsg.includes('overview')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'overview'));
  } else if (lastMsg.includes('感情')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'love'));
  } else if (lastMsg.includes('事业')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'career'));
  } else if (lastMsg.includes('财运')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'wealth'));
  } else if (lastMsg.includes('健康')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'health'));
  } else if (lastMsg.includes('性格')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'personality'));
  } else if (lastMsg.includes('兄弟姐妹') || lastMsg.includes('合伙')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'family'));
  } else if (lastMsg.includes('子女')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'children'));
  } else if (lastMsg.includes('迁移外出')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'move'));
  } else if (lastMsg.includes('人际贵人')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'friends'));
  } else if (lastMsg.includes('田宅')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'home'));
  } else if (lastMsg.includes('福德')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'spirit'));
  } else if (lastMsg.includes('父母长辈')) {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'parents'));
  } else {
    paragraphs = wrapWithHints(buildMockReadings(chart, 'overview'));
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

    const authHeader = request.headers.get('authorization');
    let currentUser = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = await getSessionByToken(token);
      if (session) {
        const user = await getUserById(session.userId);
        if (user) {
          currentUser = user;
        }
      }
    }

    const userIdentity = currentUser
      ? `当前解读请求来自已登录用户：姓名 ${currentUser.name}，手机号 ${maskPhone(currentUser.phone)}，用户ID ${currentUser.id}。请在解读风格和内容中参考此用户身份信息，但不要直接输出账号敏感信息。`
      : '当前解读请求来自未登录用户。';

    const starSect = buildStarSect(chart);
    const systemPrompt = `你是一位精通紫微斗数的大师，传承倪海夏（倪海厦）的紫微斗数体系。你正在为一位用户解读命盘。

${userIdentity}

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
        stream = generateMockStream(chart, messages, currentUser);
      }
    } catch {
      stream = generateMockStream(chart, messages, currentUser);
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
