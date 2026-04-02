"use client";

import { useState, useEffect } from "react";
import { usePomodoroStore } from "@/lib/pomodoro-store";
import Link from "next/link";

/**
 * 番茄钟设置页面
 * 功能：
 * - 选择预设时长或自定义
 * - 开始番茄钟
 * - 查看今日完成次数
 */
export default function PomodoroPage() {
  const { 
    start, 
    completedToday, 
    totalMinutesToday, 
    failedToday,
    isLoadingStats,
    status, 
    fetchStats 
  } = usePomodoroStore();
  const [customMinutes, setCustomMinutes] = useState(25);

  // 页面加载时获取统计数据
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // 预设时长选项
  const presets = [
    { label: "15 分钟", minutes: 15, color: "blue" },
    { label: "25 分钟", minutes: 25, color: "purple" },
    { label: "45 分钟", minutes: 45, color: "pink" },
  ];

  const handleStart = (minutes: number) => {
    start(minutes);
  };

  const isActive = status !== "idle";

  return (
    <div className="h-full w-full bg-black text-white font-mono flex flex-col overflow-hidden">
      {/* 顶部导航与装饰 - 吸顶 */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-primary/30 p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-primary/70 hover:text-primary transition-colors group"
        >
          <div className="w-6 h-6 border border-primary/50 flex items-center justify-center group-hover:bg-primary/20 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="tracking-widest uppercase text-sm">Back to Command</span>
        </Link>
        <div className="text-xs text-primary/30 tracking-[0.2em]">SYSTEM.POMODORO.V1</div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
        {/* 标题区域 */}
        <div className="relative border-l-4 border-primary pl-6 py-2">
          <h1 className="text-5xl font-bold text-white mb-1 font-orbitron tracking-wider">FOCUS MODULE</h1>
          <p className="text-primary/60 tracking-widest uppercase text-sm">Synchronize your productivity cycle // 同步你的效率周期</p>
          {/* 装饰性背景字 */}
          <div className="absolute -right-4 top-0 text-6xl font-bold text-primary/5 select-none pointer-events-none">
            TIMER
          </div>
        </div>

        {/* 运行中提示 */}
        {isActive && (
          <div className="bg-primary/10 border border-primary/50 p-4 flex items-center gap-4 animate-pulse relative overflow-hidden">
             <div className="absolute inset-0 bg-primary/5 skew-x-12 translate-x-full animate-[shimmer_2s_infinite]"></div>
             <div className="w-3 h-3 bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)] animate-spin" />
             <span className="text-primary font-bold tracking-widest uppercase">Sequence Running // 序列运行中，请查看悬浮窗</span>
          </div>
        )}

        {/* 今日统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 统计卡片组件 */}
          {[ 
            { label: "COMPLETED", value: completedToday, sub: "SESSIONS", color: "text-primary" },
            { label: "TOTAL TIME", value: totalMinutesToday, sub: "MINUTES", color: "text-blue-400" },
            { label: "ABORTED", value: failedToday, sub: "ATTEMPTS", color: "text-destructive" }
          ].map((stat, idx) => (
            <div key={idx} className="relative bg-gray-900/50 border border-gray-800 p-6 group hover:border-primary/50 transition-colors">
              {/* 角落装饰 */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <h3 className="text-xs text-gray-500 tracking-[0.2em] mb-2">{stat.label}</h3>
              {isLoadingStats ? (
                <div className="h-10 w-20 bg-gray-800 animate-pulse rounded"></div>
              ) : (
                <div className={`text-4xl font-bold ${stat.color} font-orbitron`}>{stat.value}</div>
              )}
              <div className="text-[10px] text-gray-600 uppercase mt-1 tracking-wider">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* 快速测试 - 缩小并融入 */}
        <div className="flex justify-end">
           <button
              onClick={() => handleStart(10 / 60)}
              disabled={isActive}
              className={`text-xs border border-dashed border-primary/30 text-primary/50 px-3 py-1 hover:bg-primary/10 hover:text-primary transition-colors uppercase tracking-widest ${
                isActive ? "opacity-30 cursor-not-allowed" : ""
              }`}
            >
              [DEBUG] 快速测试 (10s)
            </button>
        </div>

        {/* 主控制区 */}
        <div className="border-t border-b border-gray-800 py-8 relative">
          {/* 装饰线 */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          
          <h2 className="text-sm text-primary font-bold tracking-[0.3em] mb-6 uppercase flex items-center gap-4">
            <span className="w-8 h-[1px] bg-primary"></span>
            Initialize Sequence
            <span className="w-full h-[1px] bg-gray-800"></span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {presets.map((preset, idx) => (
              <button
                key={preset.minutes}
                onClick={() => handleStart(preset.minutes)}
                disabled={isActive}
                className={`group relative p-8 border transition-all duration-300 overflow-hidden ${
                  isActive
                    ? "border-gray-800 opacity-50 cursor-not-allowed"
                    : "border-gray-700 hover:border-primary bg-gray-900/30 hover:bg-primary/5"
                }`}
              >
                {/* 选中效果背景 */}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors"></div>
                
                {/* 装饰性数字背景 */}
                <div className="absolute -right-4 -bottom-4 text-6xl font-bold text-gray-800 group-hover:text-primary/10 transition-colors select-none">
                  {idx + 1}
                </div>

                <div className="relative z-10">
                  <div className="text-4xl font-bold text-white group-hover:text-primary transition-colors font-orbitron mb-2">
                    {preset.minutes}
                  </div>
                  <div className="text-xs text-gray-500 group-hover:text-primary/70 uppercase tracking-widest">
                    Minutes Standard
                  </div>
                </div>

                {/* 激活状态下的角标 */}
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="w-2 h-2 bg-primary animate-pulse"></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义时长 */}
        <div className="border border-gray-800 bg-gray-900/30 p-8 relative">
          <div className="absolute top-0 left-0 bg-gray-800 px-3 py-1 text-xs text-gray-400 uppercase tracking-widest">
            Manual Override // 手动设定
          </div>

          <div className="mt-4 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 w-full">
              <input
                type="range"
                min="1"
                max="180"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                disabled={isActive}
                className="w-full h-1 bg-gray-800 appearance-none cursor-pointer accent-primary hover:accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2 font-mono">
                <span>1 MIN</span>
                <span>180 MIN</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-5xl font-bold text-primary font-orbitron tabular-nums">
                  {customMinutes}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-widest text-right">Minutes</div>
              </div>

              <button
                onClick={() => handleStart(customMinutes)}
                disabled={isActive}
                className={`h-14 px-8 border border-primary text-primary font-bold tracking-widest uppercase transition-all hover:bg-primary hover:text-black hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-primary disabled:hover:shadow-none ${
                  isActive ? "bg-gray-800 border-gray-600 text-gray-500" : ""
                }`}
              >
                {isActive ? "SYSTEM ACTIVE" : "ENGAGE"}
              </button>
            </div>
          </div>
        </div>

        {/* 底部信息栏 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500 font-mono pt-8 border-t border-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-primary">[INFO]</span>
            <span>启动后将激活悬浮计时器 (HUD)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary">[REWARD]</span>
            <span>完成任务可获得星球能量奖励</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary">[PERSIST]</span>
            <span>计时器在页面跳转时保持激活</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}