/**
 * 指令解析工具
 * 用于从用户消息中解析番茄钟相关指令
 */

/**
 * 番茄钟指令类型
 */
export interface PomodoroCommand {
  type: "pomodoro";
  action: "start";
  minutes: number;
}

/**
 * 待办指令类型
 */
export interface TodoCommand {
  type: "todo";
  action: "create";
  title: string;
  dueDate?: number;
}

/**
 * 解析结果类型
 */
export type ParsedCommand = PomodoroCommand | TodoCommand | null;

/**
 * 中文数字到阿拉伯数字的映射
 */
const CHINESE_NUMBER_MAP: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  十一: 11,
  十二: 12,
  十三: 13,
  十四: 14,
  十五: 15,
  十六: 16,
  十七: 17,
  十八: 18,
  十九: 19,
  二十: 20,
  二十一: 21,
  二十二: 22,
  二十三: 23,
  二十四: 24,
  二十五: 25,
  二十六: 26,
  二十七: 27,
  二十八: 28,
  二十九: 29,
  三十: 30,
  三十五: 35,
  四十: 40,
  四十五: 45,
  五十: 50,
  六十: 60,
  九十: 90,
  一百二十: 120,
};

/**
 * 将中文数字转换为阿拉伯数字
 * @param chineseNum - 中文数字字符串
 * @returns 阿拉伯数字，如果无法转换则返回 null
 */
function parseChineseNumber(chineseNum: string): number | null {
  // 直接匹配
  if (CHINESE_NUMBER_MAP[chineseNum] !== undefined) {
    return CHINESE_NUMBER_MAP[chineseNum];
  }

  // 尝试解析复杂的中文数字（如 "二十五"）
  // 简化处理：只处理常见的 "X十X" 格式
  const tenMatch = chineseNum.match(/^([一二三四五六七八九])?十([一二三四五六七八九])?$/);
  if (tenMatch) {
    const tens = tenMatch[1] ? CHINESE_NUMBER_MAP[tenMatch[1]] || 0 : 1;
    const ones = tenMatch[2] ? CHINESE_NUMBER_MAP[tenMatch[2]] || 0 : 0;
    return tens * 10 + ones;
  }

  return null;
}

/**
 * 从文本中提取时长（分钟）
 * @param text - 包含时长的文本
 * @returns 分钟数，如果没有找到则返回 null
 */
function extractMinutes(text: string): number | null {
  // 匹配阿拉伯数字 + 分钟/min/分
  const arabicMatch = text.match(/(\d+)\s*(?:分钟|分|min|mins|minute|minutes)/i);
  if (arabicMatch) {
    return parseInt(arabicMatch[1], 10);
  }

  // 匹配中文数字 + 分钟/分
  const chineseMatch = text.match(
    /([零一二两三四五六七八九十百]+)\s*(?:分钟|分)/
  );
  if (chineseMatch) {
    const parsed = parseChineseNumber(chineseMatch[1]);
    if (parsed !== null) {
      return parsed;
    }
  }

  // 匹配纯数字（在番茄钟上下文中）
  const pureNumberMatch = text.match(/番茄钟\s*(\d+)/);
  if (pureNumberMatch) {
    return parseInt(pureNumberMatch[1], 10);
  }

  return null;
}

/**
 * 番茄钟触发关键词模式
 * 用于检测用户是否想要启动番茄钟
 */
const POMODORO_TRIGGER_PATTERNS = [
  // 直接命令
  /开始.*番茄钟/,
  /启动.*番茄钟/,
  /设定.*番茄钟/,
  /设置.*番茄钟/,
  /创建.*番茄钟/,
  /新建.*番茄钟/,
  /来.*番茄钟/,
  /帮我.*番茄钟/,
  /番茄钟.*开始/,
  /番茄钟.*启动/,
  /番茄钟\s*\d+/,
  // 专注相关
  /开始专注/,
  /开始.*专注/,
  /进入专注/,
  /专注模式/,
  /专注\s*\d+\s*分/,
  // 计时相关（在番茄钟上下文中）
  /帮我计时.*分钟/,
  /计时.*分钟.*番茄/,
  // 英文支持
  /start.*pomodoro/i,
  /pomodoro.*start/i,
  /begin.*focus/i,
  /focus.*timer/i,
];

/**
 * 解析日期
 */
function parseDate(text: string): number | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 今天
  if (text.includes("今天")) {
    return new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).getTime();
  }
  
  // 明天
  if (text.includes("明天")) {
    return new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 - 1).getTime();
  }
  
  // 后天
  if (text.includes("后天")) {
    return new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 - 1).getTime();
  }
  
  // 周X / 星期X / 下周X
  const weekMatch = text.match(/(?:下)?(?:周|星期)([一二三四五六日天])/);
  if (weekMatch) {
    const isNextWeek = weekMatch[0].startsWith("下");
    const dayChar = weekMatch[1];
    const dayMap: Record<string, number> = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 0, "天": 0 };
    const targetDay = dayMap[dayChar];
    
    let currentDay = today.getDay();
    let daysToAdd = targetDay - currentDay;
    
    // 如果目标是今天或过去，且没有说"下周"，通常指下周（或者本周剩下的日子？）
    // 逻辑：如果目标是周五，今天是周一，那就是本周五。
    // 如果目标是周一，今天是周二，那就是下周一。
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    if (isNextWeek) {
      daysToAdd += 7;
    }
    
    return new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 - 1).getTime();
  }
  
  // X月X日
  const dateMatch = text.match(/(\d+)月(\d+)日/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1;
    const day = parseInt(dateMatch[2]);
    let year = today.getFullYear();
    
    // 如果日期已经过了，假设是明年
    const targetDate = new Date(year, month, day);
    if (targetDate.getTime() < today.getTime()) {
      year += 1;
    }
    
    return new Date(year, month, day, 23, 59, 59, 999).getTime();
  }
  
  return undefined;
}

const TODO_TRIGGER_PATTERNS = [
  /^提醒我\s*(.+)/,
  /^(?:帮我)?(?:记一下|记住)\s*(.+)/,
  /^添加待办\s*[:：]?\s*(.+)/,
  /^待办\s*[:：\s]\s*(.+)/,
  /^待办((?:今天|明天|后天|下?周|星期|\d+月).+)/,
  /^todo\s*[:：]?\s*(.+)/i,
];

function parseTodoCommand(message: string): TodoCommand | null {
  const text = message.trim();
  
  for (const pattern of TODO_TRIGGER_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let content = match[1].trim();
      // 移除可能的开头标点
      content = content.replace(/^[，,：:\s]+/, "");
      
      if (!content) return null;
      
      const dueDate = parseDate(text);
      
      return {
        type: "todo",
        action: "create",
        title: content,
        dueDate
      };
    }
  }
  
  return null;
}

/**
 * 解析用户消息中的番茄钟指令
 * @param message - 用户消息
 * @returns 解析出的指令，如果没有匹配则返回 null
 */
export function parseCommand(message: string): ParsedCommand {
  // 优先尝试解析 Todo 指令
  const todoCommand = parseTodoCommand(message);
  if (todoCommand) {
    return todoCommand;
  }

  // 去除首尾空格
  const text = message.trim();

  // 检查是否匹配任何触发模式
  const isTriggered = POMODORO_TRIGGER_PATTERNS.some((pattern) =>
    pattern.test(text)
  );

  if (!isTriggered) {
    return null;
  }

  // 提取时长
  let minutes = extractMinutes(text);

  // 如果没有指定时长，使用默认值 25 分钟
  if (minutes === null) {
    minutes = 25;
  }

  return {
    type: "pomodoro",
    action: "start",
    minutes,
  };
}

/**
 * 验证番茄钟时长是否在有效范围内
 * @param minutes - 分钟数
 * @returns 验证结果
 */
export function validatePomodoroMinutes(minutes: number): {
  valid: boolean;
  message?: string;
} {
  if (minutes <= 0) {
    return {
      valid: false,
      message: `时长必须大于 0 分钟`,
    };
  }

  return { valid: true };
}