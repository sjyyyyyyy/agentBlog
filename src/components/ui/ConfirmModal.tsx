'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info'; // danger = 红色/破坏性, info = 金色/普通
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  type = 'danger',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const borderColor = type === 'danger' ? 'border-destructive' : 'border-primary';
  const textColor = type === 'danger' ? 'text-destructive' : 'text-primary';
  const bgColor = type === 'danger' ? 'bg-destructive/10' : 'bg-primary/10';
  const hoverBgColor = type === 'danger' ? 'hover:bg-destructive/20' : 'hover:bg-primary/20';
  const shadowColor = type === 'danger' ? 'shadow-[0_0_30px_rgba(255,51,51,0.15)]' : 'shadow-[0_0_30px_rgba(255,215,0,0.15)]';
  const decorativeBorder = type === 'danger' ? 'border-destructive' : 'border-primary';

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`relative w-full max-w-md bg-black/95 border ${borderColor} ${shadowColor} flex flex-col overflow-hidden`}>
        
        {/* HUD Corners */}
        <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${decorativeBorder}`}></div>
        <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${decorativeBorder}`}></div>
        <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${decorativeBorder}`}></div>
        <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${decorativeBorder}`}></div>

        {/* Header */}
        <div className={`p-4 border-b ${borderColor} ${bgColor} flex items-center justify-between`}>
          <h3 className={`text-lg font-bold font-orbitron tracking-widest ${textColor} flex items-center gap-2 uppercase`}>
            {type === 'danger' ? '⚠️ ' : 'ℹ️ '}
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`text-sm font-mono whitespace-pre-wrap ${type === 'danger' ? 'text-red-200' : 'text-primary/80'}`}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${borderColor} bg-black/40 flex gap-3`}>
          <button
            onClick={onCancel}
            disabled={loading}
            className={`flex-1 py-2 px-4 border ${borderColor} ${textColor} opacity-70 hover:opacity-100 hover:bg-white/5 transition-all font-mono text-xs uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2 px-4 ${bgColor} ${hoverBgColor} ${textColor} font-bold border ${borderColor} transition-all font-mono text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(0,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}