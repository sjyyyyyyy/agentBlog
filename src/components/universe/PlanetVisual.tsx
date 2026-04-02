import React from "react";

/**
 * 星球视觉组件
 * 使用 CSS 绘制不同风格的星球
 */

interface PlanetVisualProps {
  id: string;
  name: string;
  color: string;
  isUnlocked: boolean;
  size?: "sm" | "md" | "lg";
}

export default function PlanetVisual({ id, name, color, isUnlocked, size = "md" }: PlanetVisualProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  // 根据星球 ID 定义不同的视觉风格
  const getPlanetStyle = () => {
    // 基础渐变
    let background = "";
    let boxShadow = "";
    let afterContent = ""; // 用于纹理

    switch (id) {
      // 普通
      case "dawn-star": // 晨曦星 - 橙色
        background = "radial-gradient(circle at 30% 30%, #fbbf24, #d97706)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 15px rgba(251, 191, 36, 0.4)";
        break;
      case "dewdrop-star": // 露珠星 - 青色
        background = "radial-gradient(circle at 30% 30%, #a5f3fc, #0891b2)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 15px rgba(165, 243, 252, 0.4)";
        break;
      case "breeze-star": // 微风星 - 绿色
        background = "radial-gradient(circle at 30% 30%, #86efac, #16a34a)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 15px rgba(134, 239, 172, 0.4)";
        break;
      
      // 稀有
      case "aurora-star": // 极光星 - 蓝紫色
        background = "radial-gradient(circle at 30% 30%, #818cf8, #4f46e5)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 20px rgba(99, 102, 241, 0.5)";
        break;
      case "crystal-star": // 水晶星 - 白色透明感
        background = "radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)";
        boxShadow = "inset -5px -5px 15px rgba(0,0,0,0.3), 0 0 25px rgba(255, 255, 255, 0.6)";
        break;
      case "cloudsea-star": // 云海星 - 蓝白相间
        background = "radial-gradient(circle at 30% 30%, #e0f2fe, #0ea5e9)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 20px rgba(14, 165, 233, 0.5)";
        break;

      // 史诗
      case "ringed-star": // 星环星 - 土星色
        background = "radial-gradient(circle at 30% 30%, #fcd34d, #b45309)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 25px rgba(251, 191, 36, 0.6)";
        break;
      case "twin-star": // 双子星 - 粉紫色
        background = "radial-gradient(circle at 30% 30%, #f472b6, #db2777)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 25px rgba(236, 72, 153, 0.6)";
        break;
      case "polarnight-star": // 极夜星 - 深蓝黑色
        background = "radial-gradient(circle at 30% 30%, #60a5fa, #1e3a8a, #0f172a)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.8), 0 0 25px rgba(59, 130, 246, 0.6)";
        break;

      // 传说
      case "genesis-star": // 创世星 - 金色神圣
        background = "radial-gradient(circle at 30% 30%, #fef08a, #ca8a04)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 40px rgba(234, 179, 8, 0.8)";
        break;
      case "rainbow-star": // 虹彩星 - 彩虹色
        background = "conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 40px rgba(255, 255, 255, 0.6)";
        break;
      case "eternal-star": // 永恒星 - 神秘紫
        background = "radial-gradient(circle at 30% 30%, #e9d5ff, #7e22ce, #3b0764)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 50px rgba(147, 51, 234, 0.9)";
        break;
      
      default:
        background = "radial-gradient(circle at 30% 30%, #cbd5e1, #64748b)";
        boxShadow = "inset -10px -10px 20px rgba(0,0,0,0.5)";
    }

    return { background, boxShadow };
  };

  const style = getPlanetStyle();

  // 特殊效果：星环
  const hasRing = id === "ringed-star" || id === "eternal-star";

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
      {/* 星环 - 仅部分星球有 */}
      {hasRing && isUnlocked && (
        <div 
          className="absolute w-[140%] h-[40%] rounded-[50%] border-[6px] border-white/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 pointer-events-none"
          style={{ boxShadow: "0 0 10px rgba(255,255,255,0.2)" }}
        />
      )}

      {/* 星球本体 */}
      <div
        className={`w-full h-full rounded-full transition-all duration-1000 ${
          !isUnlocked ? "grayscale brightness-50 opacity-60" : "animate-float"
        }`}
        style={style}
      />

      {/* 锁图标 */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            className="w-1/3 h-1/3 text-white/50 drop-shadow-md"
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 17a2 2 0 100-4 2 2 0 000 4zm-8-9V7a8 8 0 1116 0v1h-1V7a7 7 0 10-14 0v1H4zm-1 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}