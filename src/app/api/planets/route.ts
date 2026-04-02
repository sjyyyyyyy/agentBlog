import { NextResponse } from "next/server";
import {
  PLANETS_CONFIG,
  getTotalEnergy,
  getUnlockedPlanets,
  getNextPlanet,
  getProgress,
  checkNewlyUnlockedPlanets,
} from "@/lib/planets-config";

/**
 * 星球图鉴 API
 * GET: 返回所有星球配置、解锁状态、累计能量、下一目标
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // 可选参数：之前的能量值，用于检测新解锁的星球
    const previousEnergyParam = searchParams.get("previousEnergy");
    const previousEnergy = previousEnergyParam ? parseInt(previousEnergyParam, 10) : null;

    // 获取累计能量
    const totalEnergy = await getTotalEnergy();

    // 获取已解锁的星球
    const unlockedPlanets = getUnlockedPlanets(totalEnergy);
    const unlockedIds = new Set(unlockedPlanets.map((p) => p.id));

    // 构建完整的星球列表（包含解锁状态）
    const planetsWithStatus = PLANETS_CONFIG.map((planet) => ({
      ...planet,
      unlocked: unlockedIds.has(planet.id),
    }));

    // 获取下一个待解锁星球
    const nextPlanet = getNextPlanet(totalEnergy);

    // 计算当前进度
    const progress = getProgress(totalEnergy);

    // 检查新解锁的星球（如果提供了之前的能量值）
    let newlyUnlocked: typeof PLANETS_CONFIG = [];
    if (previousEnergy !== null && !isNaN(previousEnergy)) {
      newlyUnlocked = checkNewlyUnlockedPlanets(previousEnergy, totalEnergy);
    }

    return NextResponse.json({
      // 所有星球配置（包含解锁状态）
      planets: planetsWithStatus,
      // 累计能量
      totalEnergy,
      // 已解锁数量
      unlockedCount: unlockedPlanets.length,
      // 总星球数量
      totalCount: PLANETS_CONFIG.length,
      // 下一个待解锁星球信息
      nextPlanet: nextPlanet
        ? {
            ...nextPlanet.planet,
            energyNeeded: nextPlanet.energyNeeded,
            progressPercent: nextPlanet.progressPercent,
          }
        : null,
      // 总体进度百分比
      progress,
      // 新解锁的星球（用于触发庆祝动画）
      newlyUnlocked,
    });
  } catch (error) {
    console.error("Failed to fetch planets data:", error);
    return NextResponse.json(
      { error: "Failed to fetch planets data", details: String(error) },
      { status: 500 }
    );
  }
}