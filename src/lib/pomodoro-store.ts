"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Planet, PLANETS_CONFIG } from "@/lib/planets-config";

/**
 * 番茄钟状态枚举
 */
export type PomodoroStatus = "idle" | "running" | "paused" | "success" | "failed";

/**
 * 番茄钟状态接口
 */
interface PomodoroState {
  /** 当前状态 */
  status: PomodoroStatus;
  /** 剩余秒数 */
  remainingSeconds: number;
  /** 总时长（秒） */
  totalSeconds: number;
  /** 开始时间戳 */
  startTime: number | null;
  /** 今日完成次数 */
  completedToday: number;
  /** 今日累计专注时长（分钟） */
  totalMinutesToday: number;
  /** 今日失败次数 */
  failedToday: number;
  /** 是否正在加载统计数据 */
  isLoadingStats: boolean;
  /** 累计总能量（历史所有分钟数） */
  totalEnergy: number;
  /** 本次获得的能量 */
  lastEarnedEnergy: number;
  /** 新解锁的星球（单个，取第一个解锁的） */
  newlyUnlockedPlanet: Planet | null;
}

/**
 * 番茄钟操作接口
 */
interface PomodoroActions {
  /** 开始计时 */
  start: (minutes: number) => void;
  /** 暂停 */
  pause: () => void;
  /** 继续 */
  resume: () => void;
  /** 放弃（判定为失败） */
  abandon: () => void;
  /** 完成（判定为成功） */
  complete: () => Promise<void>;
  /** 失败 */
  fail: (reason: string) => void;
  /** 更新剩余时间（每秒调用） */
  tick: () => void;
  /** 重置状态 */
  reset: () => void;
  /** 获取统计数据 */
  fetchStats: () => Promise<void>;
  /** 清除新解锁星球 */
  clearNewlyUnlockedPlanet: () => void;
}

type PomodoroStore = PomodoroState & PomodoroActions;

/**
 * 检查本次番茄钟是否解锁了新星球（客户端版本）
 * @param prevEnergy - 完成前的能量
 * @param currentEnergy - 完成后的能量
 * @returns 新解锁的星球列表
 */
function checkNewlyUnlockedPlanetsClient(
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
 * 番茄钟状态管理 Store
 * 使用 zustand 进行全局状态管理，并使用 persist 中间件实现持久化，防止刷新页面丢失状态
 */
export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      status: "idle",
      remainingSeconds: 0,
      totalSeconds: 0,
      startTime: null,
      completedToday: 0,
      totalMinutesToday: 0,
      failedToday: 0,
      isLoadingStats: false,
      totalEnergy: 0,
      lastEarnedEnergy: 0,
      newlyUnlockedPlanet: null,

      /**
       * 开始番茄钟计时
       * @param minutes - 计时分钟数
       */
      start: (minutes: number) => {
        const { status } = get();
        // 如果已经在运行，不允许再次启动
        if (status !== "idle") return;

        // 将分钟转换为整数秒，避免小数
        const totalSeconds = Math.round(minutes * 60);
        set({
          status: "running",
          remainingSeconds: totalSeconds,
          totalSeconds: totalSeconds,
          startTime: Date.now(),
          lastEarnedEnergy: 0,
          newlyUnlockedPlanet: null,
        });
      },

      /**
       * 暂停计时
       */
      pause: () => {
        const { status } = get();
        if (status === "running") {
          set({ status: "paused" });
        }
      },

      /**
       * 继续计时
       */
      resume: () => {
        const { status } = get();
        if (status === "paused") {
          set({ status: "running" });
        }
      },

      /**
       * 放弃当前番茄钟（判定为失败）
       */
      abandon: () => {
        get().fail("用户主动放弃");
      },

      /**
       * 完成番茄钟（判定为成功）
       */
      complete: async () => {
        const { completedToday, totalSeconds, totalMinutesToday, totalEnergy } = get();
        // 计算分钟数，至少记录 1 分钟（用于短时间测试场景）
        const minutes = Math.max(1, Math.round(totalSeconds / 60));
        const prevEnergy = totalEnergy;
        const newTotalEnergy = totalEnergy + minutes;

        // 检查新解锁的星球（取第一个）
        const newlyUnlocked = checkNewlyUnlockedPlanetsClient(prevEnergy, newTotalEnergy);
        const firstUnlocked = newlyUnlocked.length > 0 ? newlyUnlocked[0] : null;

        // 乐观更新
        set({
          status: "success",
          remainingSeconds: 0,
          completedToday: completedToday + 1,
          totalMinutesToday: totalMinutesToday + minutes,
          lastEarnedEnergy: minutes,
          totalEnergy: newTotalEnergy,
          newlyUnlockedPlanet: firstUnlocked,
        });

        // 调用 API 记录
        try {
          const res = await fetch("/api/pomodoro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minutes }),
          });

          if (res.ok) {
            // API 返回的字段名是 completed_count（已在 API 层做了映射）
            const data = await res.json() as { completed_count?: number; total_minutes?: number };
            // 使用服务器返回的数据更新
            set({
              completedToday: data.completed_count ?? completedToday + 1,
              totalMinutesToday: data.total_minutes ?? totalMinutesToday + minutes,
            });
          }
        } catch (error) {
          console.error("Failed to record pomodoro stats:", error);
        }
      },

      /**
       * 失败
       * @param reason - 失败原因
       */
      fail: (reason: string) => {
        const { failedToday } = get();
        set({
          status: "failed",
          failedToday: failedToday + 1,
          lastEarnedEnergy: 0,
          newlyUnlockedPlanet: null,
        });
      },

      /**
       * 每秒更新剩余时间
       */
      tick: () => {
        const { status, remainingSeconds } = get();
        if (status === "running" && remainingSeconds > 0) {
          const newRemaining = remainingSeconds - 1;
          if (newRemaining <= 0) {
            // 计时结束，自动完成
            get().complete();
          } else {
            set({ remainingSeconds: newRemaining });
          }
        }
      },

      /**
       * 重置为初始状态
       */
      reset: () => {
        set({
          status: "idle",
          remainingSeconds: 0,
          totalSeconds: 0,
          startTime: null,
          lastEarnedEnergy: 0,
          newlyUnlockedPlanet: null,
        });
      },

      /**
       * 清除新解锁星球
       */
      clearNewlyUnlockedPlanet: () => {
        set({ newlyUnlockedPlanet: null });
      },

      /**
       * 获取统计数据
       */
      fetchStats: async () => {
        set({ isLoadingStats: true });
        try {
          // 获取番茄钟统计
          const pomodoroRes = await fetch("/api/pomodoro");
          if (pomodoroRes.ok) {
            const data = await pomodoroRes.json() as { 
              today?: { completed_count?: number; total_minutes?: number } 
            };
            if (data.today) {
              set({
                completedToday: data.today.completed_count ?? 0,
                totalMinutesToday: data.today.total_minutes ?? 0,
              });
            }
          }

          // 获取累计能量
          const planetsRes = await fetch("/api/planets");
          if (planetsRes.ok) {
            const planetsData = await planetsRes.json() as { totalEnergy?: number };
            set({
              totalEnergy: planetsData.totalEnergy ?? 0,
            });
          }
        } catch (error) {
          console.error("Failed to fetch pomodoro stats:", error);
        } finally {
          set({ isLoadingStats: false });
        }
      },
    }),
    {
      name: "pomodoro-storage",
      storage: createJSONStorage(() => localStorage),
      // 只持久化必要的状态，不持久化新解锁星球
      partialize: (state) => ({
        status: state.status,
        remainingSeconds: state.remainingSeconds,
        totalSeconds: state.totalSeconds,
        startTime: state.startTime,
        completedToday: state.completedToday,
        totalMinutesToday: state.totalMinutesToday,
        failedToday: state.failedToday,
        totalEnergy: state.totalEnergy,
      }),
    }
  )
);

/**
 * 格式化秒数为 MM:SS 格式
 * @param seconds - 秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(seconds: number): string {
  // 确保秒数为整数
  const totalSecs = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 计算进度百分比
 * @param remaining - 剩余秒数
 * @param total - 总秒数
 * @returns 进度百分比 (0-100)
 */
export function calculateProgress(remaining: number, total: number): number {
  if (total === 0) return 0;
  return ((total - remaining) / total) * 100;
}

