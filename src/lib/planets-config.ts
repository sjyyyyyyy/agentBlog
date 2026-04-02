/**
 * 星球图鉴配置文件
 * 定义星球类型、稀有度、解锁规则等
 */

import { queryD1 } from "@/lib/d1";

/**
 * 星球稀有度
 * - common: 普通
 * - rare: 稀有
 * - epic: 史诗
 * - legendary: 传说
 */
export type PlanetRarity = "common" | "rare" | "epic" | "legendary";

/**
 * 星球类型定义
 */
export interface Planet {
  /** 唯一标识 */
  id: string;
  /** 星球名称 */
  name: string;
  /** 星球描述 */
  description: string;
  /** 解锁所需能量（1分钟 = 1能量） */
  requiredEnergy: number;
  /** 星球图片路径 */
  image: string;
  /** 稀有度 */
  rarity: PlanetRarity;
  /** 是否已解锁（运行时计算） */
  unlocked?: boolean;
}

/**
 * 稀有度配置
 */
export const RARITY_CONFIG: Record<PlanetRarity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  common: {
    label: "普通",
    color: "text-gray-300",
    bgColor: "bg-gray-500/20",
    borderColor: "border-gray-500/30",
    glowColor: "shadow-gray-400/20",
  },
  rare: {
    label: "稀有",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-400/30",
  },
  epic: {
    label: "史诗",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-400/30",
  },
  legendary: {
    label: "传说",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/30",
    glowColor: "shadow-yellow-400/40",
  },
};

/**
 * 预设星球配置（12个星球，按稀有度分组）
 */
export const PLANETS_CONFIG: Planet[] = [
  // ============ 普通（Common）- 解锁能量：25、75、150 ============
  {
    id: "dawn-star",
    name: "晨曦星",
    description: "新手的第一颗星球，散发温暖的橙色光芒",
    requiredEnergy: 25,
    image: "/planets/dawn-star.png",
    rarity: "common",
  },
  {
    id: "dewdrop-star",
    name: "露珠星",
    description: "表面覆盖晶莹水滴，折射七彩光芒",
    requiredEnergy: 75,
    image: "/planets/dewdrop-star.png",
    rarity: "common",
  },
  {
    id: "breeze-star",
    name: "微风星",
    description: "大气层中永远吹拂着轻柔的风",
    requiredEnergy: 150,
    image: "/planets/breeze-star.png",
    rarity: "common",
  },

  // ============ 稀有（Rare）- 解锁能量：300、500、750 ============
  {
    id: "aurora-star",
    name: "极光星",
    description: "极光永不停歇地在天空舞动",
    requiredEnergy: 300,
    image: "/planets/aurora-star.png",
    rarity: "rare",
  },
  {
    id: "crystal-star",
    name: "水晶星",
    description: "整颗星球由透明水晶构成",
    requiredEnergy: 500,
    image: "/planets/crystal-star.png",
    rarity: "rare",
  },
  {
    id: "cloudsea-star",
    name: "云海星",
    description: "被层层叠叠的云海包裹",
    requiredEnergy: 750,
    image: "/planets/cloudsea-star.png",
    rarity: "rare",
  },

  // ============ 史诗（Epic）- 解锁能量：1000、1500、2000 ============
  {
    id: "ringed-star",
    name: "星环星",
    description: "拥有壮观的行星环系统",
    requiredEnergy: 1000,
    image: "/planets/ringed-star.png",
    rarity: "epic",
  },
  {
    id: "twin-star",
    name: "双子星",
    description: "两颗星球相互环绕",
    requiredEnergy: 1500,
    image: "/planets/twin-star.png",
    rarity: "epic",
  },
  {
    id: "polarnight-star",
    name: "极夜星",
    description: "永恒的星空下闪烁着神秘光芒",
    requiredEnergy: 2000,
    image: "/planets/polarnight-star.png",
    rarity: "epic",
  },

  // ============ 传说（Legendary）- 解锁能量：3000、5000、10000 ============
  {
    id: "genesis-star",
    name: "创世星",
    description: "宇宙最古老的星球之一",
    requiredEnergy: 3000,
    image: "/planets/genesis-star.png",
    rarity: "legendary",
  },
  {
    id: "rainbow-star",
    name: "虹彩星",
    description: "表面流动着液态彩虹",
    requiredEnergy: 5000,
    image: "/planets/rainbow-star.png",
    rarity: "legendary",
  },
  {
    id: "eternal-star",
    name: "永恒星",
    description: "时间在这里静止，见证宇宙变迁",
    requiredEnergy: 10000,
    image: "/planets/eternal-star.png",
    rarity: "legendary",
  },
];

// ============ 能量计算工具函数 ============

/**
 * 从 D1 数据库获取历史累计分钟数（即累计能量）
 * 能量规则：每完成 1 分钟番茄钟 = 1 点能量
 * @returns 累计能量值
 */
export async function getTotalEnergy(): Promise<number> {
  try {
    const result = await queryD1(
      "SELECT SUM(total_minutes) as total FROM pomodoro_stats"
    );
    
    const row = result[0] as { total: number | null } | undefined;
    return row?.total ?? 0;
  } catch (error) {
    console.error("Failed to get total energy:", error);
    return 0;
  }
}

/**
 * 获取已解锁的星球列表
 * @param totalEnergy - 累计能量值
 * @returns 已解锁的星球数组
 */
export function getUnlockedPlanets(totalEnergy: number): Planet[] {
  return PLANETS_CONFIG.filter((planet) => totalEnergy >= planet.requiredEnergy).map(
    (planet) => ({
      ...planet,
      unlocked: true,
    })
  );
}

/**
 * 获取下一个待解锁的星球
 * @param totalEnergy - 累计能量值
 * @returns 下一个星球及还需能量，如果全部解锁则返回 null
 */
export function getNextPlanet(totalEnergy: number): {
  planet: Planet;
  energyNeeded: number;
  progressPercent: number;
} | null {
  // 按解锁能量排序
  const sortedPlanets = [...PLANETS_CONFIG].sort(
    (a, b) => a.requiredEnergy - b.requiredEnergy
  );

  // 找到第一个未解锁的星球
  const nextPlanet = sortedPlanets.find(
    (planet) => totalEnergy < planet.requiredEnergy
  );

  if (!nextPlanet) {
    return null; // 全部解锁
  }

  // 计算进度百分比
  const prevThreshold = getPreviousThreshold(nextPlanet.requiredEnergy);
  const range = nextPlanet.requiredEnergy - prevThreshold;
  const current = totalEnergy - prevThreshold;
  const progressPercent = Math.round((current / range) * 100);

  return {
    planet: { ...nextPlanet, unlocked: false },
    energyNeeded: nextPlanet.requiredEnergy - totalEnergy,
    progressPercent,
  };
}

/**
 * 获取当前解锁进度
 * @param totalEnergy - 累计能量值
 * @returns 进度百分比 (0-100)
 */
export function getProgress(totalEnergy: number): number {
  const unlockedCount = PLANETS_CONFIG.filter(
    (planet) => totalEnergy >= planet.requiredEnergy
  ).length;
  const totalCount = PLANETS_CONFIG.length;
  return Math.round((unlockedCount / totalCount) * 100);
}

/**
 * 获取前一个解锁阈值
 * @param currentThreshold - 当前阈值
 * @returns 前一个阈值，如果是第一个则返回 0
 */
function getPreviousThreshold(currentThreshold: number): number {
  const sortedThresholds = [...PLANETS_CONFIG]
    .map((p) => p.requiredEnergy)
    .sort((a, b) => a - b);

  const index = sortedThresholds.indexOf(currentThreshold);
  return index > 0 ? sortedThresholds[index - 1] : 0;
}

/**
 * 检查本次番茄钟是否解锁了新星球
 * @param prevEnergy - 完成前的能量
 * @param currentEnergy - 完成后的能量
 * @returns 新解锁的星球列表
 */
export function checkNewlyUnlockedPlanets(
  prevEnergy: number,
  currentEnergy: number
): Planet[] {
  return PLANETS_CONFIG.filter(
    (planet) =>
      prevEnergy < planet.requiredEnergy &&
      currentEnergy >= planet.requiredEnergy
  ).map((planet) => ({
    ...planet,
    unlocked: true,
  }));
}

/**
 * 获取所有星球（带解锁状态）
 * @param totalEnergy - 累计能量值
 * @returns 带解锁状态的星球列表
 */
export function getAllPlanetsWithStatus(totalEnergy: number): Planet[] {
  return PLANETS_CONFIG.map((planet) => ({
    ...planet,
    unlocked: totalEnergy >= planet.requiredEnergy,
  }));
}