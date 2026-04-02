'use client';

import { useState, useEffect } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

interface DecodingTextProps {
  text?: string;
  minLen?: number;
  maxLen?: number;
  className?: string;
}

export default function DecodingText({ text, minLen = 1, maxLen = 5, className }: DecodingTextProps) {
  const [display, setDisplay] = useState('');
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    interval = setInterval(() => {
      let result = '';
      
      // 增强长度变化范围
      const targetLen = text ? text.length : Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
      
      for (let i = 0; i < targetLen; i++) {
        result += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setDisplay(result);

      // 随机透明度变化，模拟信号不稳定
      if (!text) {
          setOpacity(Math.random() * 0.6 + 0.4); // 0.4 - 1.0
      }
    }, 80);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span 
      className={`font-mono inline-block select-none ml-1 align-text-bottom transition-opacity duration-75 ${className || `text-primary bg-primary/20 rounded-sm ${!text ? 'shadow-[0_0_8px_rgba(255,215,0,0.6)]' : ''}`}`}
      style={{ opacity: opacity }}
    >
      {display || '█'}
    </span>
  );
}