"use client";

import { useEffect, useRef, useState } from "react";
import { usePomodoroStore, formatTime, calculateProgress } from "@/lib/pomodoro-store";
import ConfirmModal from "@/components/ui/ConfirmModal";

/**
 * 悬浮番茄钟计时器组件
 * 功能：
 * - 悬浮在页面右下角
 * - 可拖拽移动
 * - 显示倒计时和进度
 * - 支持暂停/继续/放弃操作
 * - 页面可见性检测
 * - 成功/失败状态显示
 * - 星球能量奖励系统
 */
export default function FloatingTimer() {
  const { 
    status, 
    remainingSeconds, 
    totalSeconds, 
    pause, 
    resume, 
    abandon, 
    tick,
    reset,
    completedToday,
    totalMinutesToday,
    totalEnergy,
    lastEarnedEnergy,
    newlyUnlockedPlanet,
    clearNewlyUnlockedPlanet
  } = usePomodoroStore();

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pomodoro_timer_pos');
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('pomodoro_timer_pos', JSON.stringify(position));
    }
  }, [position, isDragging]);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "running") {
      const interval = setInterval(() => {
        tick();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, tick]);

  useEffect(() => {
    if (status === "success") {
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      const timer = setTimeout(() => {
        reset();
        clearNewlyUnlockedPlanet();
      }, 5000);

      return () => clearTimeout(timer);
    } else if (status === "failed") {
      const timer = setTimeout(() => {
        reset();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [status, reset, clearNewlyUnlockedPlanet]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        const maxX = window.innerWidth - (timerRef.current?.offsetWidth || 120);
        const maxY = window.innerHeight - (timerRef.current?.offsetHeight || 120);
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (status === "idle") {
    return null;
  }

  const progress = calculateProgress(remainingSeconds, totalSeconds);
  const isPaused = status === "paused";
  const isSuccess = status === "success";
  const isFailed = status === "failed";

  if (isSuccess) {
    const hasNewPlanet = !!newlyUnlockedPlanet;
    
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className={`p-8 border-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] text-center max-w-md w-full relative ${
          hasNewPlanet 
            ? "bg-black/95 border-primary shadow-[0_0_30px_rgba(255,215,0,0.3)]" 
            : "bg-black/95 border-primary"
        }`}>
          {/* HUD Corner Decorators */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>

          {/* 解锁新星球的特殊庆祝 */}
          {hasNewPlanet ? (
            <>
              <div className="text-6xl mb-4 text-primary">🌟</div>
              <h2 className="text-2xl font-bold text-primary mb-2 font-orbitron tracking-widest">发现新星球</h2>
              <div className="bg-primary/10 border border-primary/30 p-6 mb-4">
                <div className="text-5xl mb-2">{newlyUnlockedPlanet.image}</div>
                <div className="text-5xl mb-2">{newlyUnlockedPlanet.image}</div>
                <div className="text-xl font-bold text-primary font-mono">{newlyUnlockedPlanet.name}</div>
                <div className="text-sm text-primary/70 mt-1 font-mono">{newlyUnlockedPlanet.description}</div>
                <div className="mt-2 inline-block px-3 py-1 border border-primary/50 text-xs font-mono tracking-widest text-primary uppercase">
                  {newlyUnlockedPlanet.rarity}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-primary mb-2 font-orbitron tracking-widest">任务完成</h2>
              <p className="text-primary/70 text-lg mb-4 font-mono">专注会话已记录</p>
            </>
          )}

          <div className="bg-primary/5 border border-primary/20 p-4 mb-4">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary font-mono">
              <span>⚡</span>
              <span>+{lastEarnedEnergy} 能量</span>
            </div>
            <div className="text-sm text-primary/60 mt-1 font-mono">
              总计: {totalEnergy}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-4 mb-4">
            <div className="text-lg font-bold text-primary font-mono">
              今日专注: {completedToday} 次
            </div>
            <div className="text-sm text-primary/60 mt-1 font-mono">
              总时长: {totalMinutesToday} 分钟
            </div>
          </div>

          <button
            onClick={() => {
              reset();
              clearNewlyUnlockedPlanet();
            }}
            className="w-full py-3 border border-primary text-primary hover:bg-primary/20 hover:shadow-glow-primary transition-all font-mono uppercase tracking-widest"
          >
            {hasNewPlanet ? "确认发现" : "继续任务"}
          </button>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-black/95 border border-destructive p-8 shadow-[0_0_30px_rgba(255,51,51,0.3)] text-center max-w-md w-full relative">
           {/* HUD Corner Decorators (Red) */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-destructive"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-destructive"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-destructive"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-destructive"></div>

          <div className="text-6xl mb-4 text-destructive">⚠</div>
          <h2 className="text-2xl font-bold text-destructive mb-2 font-orbitron tracking-widest">任务失败</h2>
          <p className="text-destructive/70 text-lg mb-4 font-mono">专注会话已终止</p>
          <button
            onClick={reset}
            className="w-full py-3 border border-destructive text-destructive hover:bg-destructive/20 hover:shadow-[0_0_10px_rgba(255,51,51,0.5)] transition-all font-mono uppercase tracking-widest"
          >
            确认
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={timerRef}
      className={`fixed z-[9999] select-none transition-opacity ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 主容器 - 雷达圆环风格 */}
      <div
        className={`relative w-36 h-36 rounded-full backdrop-blur-md transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
          isPaused
            ? "bg-black/80"
            : "bg-black/80 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
        }`}
      >
        {/* 旋转雷达扫描线 (仅运行时) */}
        {!isPaused && (
          <div className="absolute inset-0 rounded-full border-t border-primary/80 animate-spin" style={{ animationDuration: '3s' }}></div>
        )}

        {/* SVG 绘图层：包含边框和进度条 */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 144 144">
          {/* 外边框 (模拟原来的 border) */}
          <circle
            cx="72"
            cy="72"
            r="71"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-colors duration-300 ${
              isPaused ? "text-gray-500/50" : "text-primary/50"
            }`}
          />
          
          {/* 进度轨道背景 */}
          <circle
            cx="72"
            cy="72"
            r="64"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-800/50"
          />
          
          {/* 进度条 */}
          <circle
            cx="72"
            cy="72"
            r="64"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 64}`}
            strokeDashoffset={`${2 * Math.PI * 64 * (1 - progress / 100)}`}
            className={`transition-all duration-1000 ${
              isPaused ? "text-gray-500" : "text-primary"
            }`}
            strokeLinecap="round"
          />
        </svg>

        {/* 内容区域 */}
        <div className="relative flex flex-col items-center justify-center z-10">
          {/* 状态文字 */}
          {isPaused && (
            <div className="text-xs text-destructive font-mono animate-pulse tracking-widest mb-1">
              暂停
            </div>
          )}
          {!isPaused && (
            <div className="text-[10px] text-primary/50 font-mono tracking-widest mb-1">
              运行中
            </div>
          )}

          {/* 倒计时 */}
          <div
            className={`text-2xl font-bold font-mono tracking-wider transition-colors ${
              isPaused ? "text-gray-400" : "text-white"
            }`}
          >
            {formatTime(remainingSeconds)}
          </div>

          {/* 操作按钮 (仅悬浮显示，或紧凑排列) */}
          <div className="flex gap-3 mt-2">
            {/* 暂停/继续按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                isPaused ? resume() : pause();
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 ${
                isPaused
                  ? "border-primary text-primary hover:bg-primary/20"
                  : "border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
              }`}
            >
              {isPaused ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>

            {/* 放弃按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAbandonConfirm(true);
              }}
              className="w-8 h-8 rounded-full border border-destructive text-destructive hover:bg-destructive/20 flex items-center justify-center transition-all hover:scale-110"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showAbandonConfirm}
        title="终止任务"
        message="警告：放弃当前任务将无法获得奖励。\n\n确定要终止吗？"
        onConfirm={() => {
          abandon();
          setShowAbandonConfirm(false);
        }}
        onCancel={() => setShowAbandonConfirm(false)}
        confirmText="终止"
        cancelText="继续"
        type="danger"
      />
    </div>
  );
}