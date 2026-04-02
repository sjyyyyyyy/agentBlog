"use client";

import { useState, useEffect, useCallback } from "react";
import { create } from "zustand";

/**
 * Toast 类型
 */
export type ToastType = "success" | "error" | "info" | "warning";

/**
 * Toast 消息接口
 */
interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

/**
 * Toast Store 接口
 */
interface ToastStore {
  toasts: ToastMessage[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Toast 状态管理 Store
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

/**
 * 便捷的 toast 调用方法
 */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast("success", message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast("error", message, duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast("info", message, duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast("warning", message, duration),
};

/**
 * 单个 Toast 项组件
 */
function ToastItem({ toast: t, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 入场动画
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // 自动消失
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onRemove, 300);
    }, t.duration);

    return () => clearTimeout(timer);
  }, [t.duration, onRemove]);

  // 根据类型获取样式
  const getTypeStyles = () => {
    switch (t.type) {
      case "success":
        return "bg-black/90 border-primary text-primary shadow-[0_0_10px_rgba(255,215,0,0.2)]";
      case "error":
        return "bg-black/90 border-destructive text-destructive shadow-[0_0_10px_rgba(255,51,51,0.2)]";
      case "warning":
        return "bg-black/90 border-primary text-primary shadow-[0_0_10px_rgba(255,215,0,0.2)]";
      case "info":
      default:
        return "bg-black/90 border-secondary text-secondary shadow-[0_0_10px_rgba(0,212,255,0.2)]";
    }
  };

  // 根据类型获取图标
  const getIcon = () => {
    switch (t.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
      default:
        return "ℹ";
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 border font-mono text-sm tracking-wide
        transition-all duration-300 ease-out
        ${getTypeStyles()}
        ${isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <span className="text-lg">{getIcon()}</span>
      <span>{t.message}</span>
      <button
        onClick={() => {
          setIsLeaving(true);
          setTimeout(onRemove, 300);
        }}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Toast 容器组件
 * 需要在 layout 中全局挂载
 */
export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const handleRemove = useCallback(
    (id: string) => {
      removeToast(id);
    },
    [removeToast]
  );

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => handleRemove(t.id)} />
      ))}
    </div>
  );
}
