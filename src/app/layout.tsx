import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Share_Tech_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import FloatingTimer from "@/components/pomodoro/FloatingTimer";
import ToastContainer from "@/components/ui/Toast";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

// PWA 主题色配置
const THEME_COLOR = "#050510";

export const metadata: Metadata = {
  title: "AI 助手",
  description: "智能 AI 助手应用",
  // PWA manifest 配置
  manifest: "/manifest.json",
  // Apple 设备专用配置
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI助手",
  },
  // 其他 PWA 相关 meta
  applicationName: "AI 助手",
  formatDetection: {
    telephone: false,
  },
};

// 视口和主题色配置（Next.js 15 推荐分离）
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serviceWorkerScript =
    process.env.NODE_ENV === "production"
      ? `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('SW registered: ', registration.scope);
                })
                .catch(function(error) {
                  console.log('SW registration failed: ', error);
                });
            });
          }
        `
      : `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              registrations.forEach(function(registration) {
                registration.unregister();
              });
            });
          }
          if ('caches' in window) {
            caches.keys().then(function(cacheNames) {
              cacheNames
                .filter(function(name) { return name.indexOf('ai-assistant-cache') === 0; })
                .forEach(function(name) {
                  caches.delete(name);
                });
            });
          }
        `;

  return (
    <html lang="zh-CN">
      <head>
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/workRabbit.png" />
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/icons/workRabbit.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/icons/winterRabbit.png"
        />
        {/* Apple 启动画面背景色 */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
                  <body
        className={`${geistSans.variable} ${geistMono.variable} ${shareTechMono.variable} ${orbitron.variable} antialiased bg-background text-foreground overflow-hidden text-sm md:text-base`}
      >
        <div className="poi-container relative w-full h-screen overflow-hidden flex flex-col border-[3px] border-transparent poi-pulse">
                        {/* Global Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none z-0 grid-overlay"></div>
                                                {/* Background Scanline (Behind Content) */}
            <div className="scanline-bar"></div>
            
            {/* Top Layer CRT Effects (Above Content) */}
            <div className="crt-lines"></div>
            
            {/* System Status Bar (Top) */}
            <header className="relative z-10 flex items-center justify-between px-4 py-1 border-b border-primary/30 bg-background/90 text-xs font-mono uppercase tracking-widest text-primary/80 h-8 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="hidden sm:inline flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_5px_rgba(255,215,0,0.8)]"></span>
                      SYS.STATUS: ONLINE
                    </span>
                    <span className="hidden sm:inline">NET.SEC: SECURE</span>
                    <span className="sm:hidden">SYS: OK</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden sm:inline">TARGET: ANALYZING</span>
                    <span className="text-secondary">POI-OS v2.0</span>
                </div>
            </header>

                        {/* Main Content Area with HUD corners */}
            <main className="relative z-10 flex-1 overflow-hidden p-0 sm:p-4 scrollbar-hide">
                {children}
            </main>
            
            {/* Global HUD Decorators */}
            <div className="pointer-events-none absolute top-8 left-0 w-4 h-4 border-t border-l border-primary/50 z-20"></div>
            <div className="pointer-events-none absolute top-8 right-0 w-4 h-4 border-t border-r border-primary/50 z-20"></div>
            <div className="pointer-events-none absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/50 z-20"></div>
            <div className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/50 z-20"></div>
        </div>
        
        {/* 全局悬浮番茄钟组件 */}
        <FloatingTimer />
        {/* 全局 Toast 容器 */}
        <ToastContainer />
        {/* Service Worker 注册脚本 */}
        <script
          dangerouslySetInnerHTML={{
            __html: serviceWorkerScript,
          }}
        />
      </body>
    </html>
  );
}
