"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Planet, PlanetRarity, RARITY_CONFIG } from "@/lib/planets-config";
import PlanetVisual from "@/components/universe/PlanetVisual";

interface UniverseData {
  planets: Planet[];
  totalEnergy: number;
  unlockedCount: number;
  totalCount: number;
  nextPlanet: (Planet & { energyNeeded: number; progressPercent: number }) | null;
  progress: number;
}

export default function UniversePage() {
  const [data, setData] = useState<UniverseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/planets");
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (error) {
      console.error("Failed to fetch universe data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 按稀有度分组
  const groupedPlanets = data?.planets.reduce((acc, planet) => {
    if (!acc[planet.rarity]) {
      acc[planet.rarity] = [];
    }
    acc[planet.rarity].push(planet);
    return acc;
  }, {} as Record<PlanetRarity, Planet[]>) || {};

  // 稀有度显示顺序
  const rarityOrder: PlanetRarity[] = ["common", "rare", "epic", "legendary"];

  if (isLoading) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0f172a] text-white flex flex-col overflow-hidden relative">
      {/* 星空背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 深空背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#1a103c] to-[#0f172a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-50" />
        
        {/* 动态星星 - 使用 CSS 动画 */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 5 + "s",
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* 顶部导航 - 吸顶 */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur-sm p-6 border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回首页
          </Link>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* 标题区域 */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 mb-4">
              我的宇宙
            </h1>
            <p className="text-gray-400 text-lg">收集能量，点亮星空</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* 累计能量 */}
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors" />
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider">累计能量</div>
              <div className="text-5xl font-bold text-yellow-400 drop-shadow-lg flex items-center gap-2">
                <span className="text-3xl">⚡</span>
                {data?.totalEnergy}
              </div>
            </div>

            {/* 解锁进度 */}
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider">已解锁星球</div>
              <div className="text-5xl font-bold text-purple-400 drop-shadow-lg">
                {data?.unlockedCount} <span className="text-2xl text-gray-500">/ {data?.totalCount}</span>
              </div>
              {/* 进度条 */}
              <div className="w-full h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                  style={{ width: `${data?.progress}%` }}
                />
              </div>
            </div>

            {/* 下一目标 */}
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
              <div className="text-gray-400 text-sm mb-2 uppercase tracking-wider">下一目标</div>
              {data?.nextPlanet ? (
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">{data.nextPlanet.name}</div>
                  <div className="text-blue-400 text-sm">
                    还需 {data.nextPlanet.energyNeeded} 能量
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    当前进度 {data.nextPlanet.progressPercent}%
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">全部解锁！</div>
                  <div className="text-gray-400 text-sm">你是宇宙探索大师</div>
                </div>
              )}
            </div>
          </div>

          {/* 星球列表 - 按稀有度分组 */}
          <div className="space-y-16">
            {rarityOrder.map((rarity) => {
              const planets = groupedPlanets[rarity] || [];
              if (planets.length === 0) return null;

              const config = RARITY_CONFIG[rarity];

              return (
                <div key={rarity} className="relative">
                  {/* 分组标题 */}
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className={`text-2xl font-bold ${config.color}`}>{config.label}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
                  </div>

                  {/* 星球网格 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {planets.map((planet) => (
                      <button
                        key={planet.id}
                        onClick={() => setSelectedPlanet(planet)}
                        className={`group relative aspect-[3/4] rounded-2xl border transition-all duration-300 flex flex-col items-center justify-between p-6 overflow-hidden ${
                          planet.unlocked
                            ? `bg-gray-800/30 border-gray-700/50 hover:border-${config.color.split('-')[1]}-500/50 hover:bg-gray-800/50 hover:-translate-y-2`
                            : "bg-gray-900/50 border-gray-800 cursor-default opacity-70"
                        }`}
                      >
                        {/* 背景光晕 - 仅解锁显示 */}
                        {planet.unlocked && (
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-b from-${config.color.split('-')[1]}-500/20 to-transparent`} />
                        )}

                        {/* 星球视觉 */}
                        <div className="flex-1 flex items-center justify-center w-full">
                          <PlanetVisual 
                            id={planet.id} 
                            name={planet.name} 
                            color={config.color} 
                            isUnlocked={!!planet.unlocked} 
                            size="lg"
                          />
                        </div>

                        {/* 星球信息 */}
                        <div className="text-center relative z-10 w-full">
                          <div className={`font-bold text-lg mb-1 ${planet.unlocked ? "text-white" : "text-gray-500"}`}>
                            {planet.name}
                          </div>
                          
                          {planet.unlocked ? (
                            <div className={`text-xs px-2 py-1 rounded-full inline-block ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                              已收集
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                              <span>🔒</span>
                              <span>需 {planet.requiredEnergy} 能量</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedPlanet && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedPlanet(null)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-3xl max-w-md w-full p-8 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button 
              onClick={() => setSelectedPlanet(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 弹窗内容 */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-8 scale-150">
                <PlanetVisual 
                  id={selectedPlanet.id} 
                  name={selectedPlanet.name} 
                  color="" 
                  isUnlocked={!!selectedPlanet.unlocked} 
                  size="lg"
                />
              </div>

              <h2 className="text-3xl font-bold text-white mb-2">{selectedPlanet.name}</h2>
              
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-6 ${
                RARITY_CONFIG[selectedPlanet.rarity].bgColor
              } ${RARITY_CONFIG[selectedPlanet.rarity].color} border ${RARITY_CONFIG[selectedPlanet.rarity].borderColor}`}>
                {RARITY_CONFIG[selectedPlanet.rarity].label}
              </div>

              <p className="text-gray-300 leading-relaxed mb-8">
                {selectedPlanet.unlocked 
                  ? selectedPlanet.description 
                  : "这颗星球还隐藏在迷雾中，继续积累能量来发现它的真面目吧。"}
              </p>

              <div className="w-full bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                <span className="text-gray-400">所需能量</span>
                <span className="text-yellow-400 font-bold flex items-center gap-1">
                  ⚡ {selectedPlanet.requiredEnergy}
                </span>
              </div>

              {!selectedPlanet.unlocked && data && (
                <div className="w-full mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>当前进度</span>
                    <span>{Math.min(100, Math.round((data.totalEnergy / selectedPlanet.requiredEnergy) * 100))}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gray-600"
                      style={{ width: `${Math.min(100, (data.totalEnergy / selectedPlanet.requiredEnergy) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}