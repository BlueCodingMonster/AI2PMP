"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import {
  User,
  Lock,
  Loader2,
  AlertCircle,
  Compass,
  Rocket,
  Cpu,
  ArrowRight,
} from "lucide-react";
import SdlcIcon from "@/components/ui/sdlc-icon";

/**
 * Gemini 风格的星际宇宙尘埃粒子流效 (Canvas 高性能渲染)
 */
function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);
    ctx.scale(dpr, dpr);

    let drawWidth = window.innerWidth;
    let drawHeight = window.innerHeight;

    // 监听视口大小变化
    const handleResize = () => {
      if (!canvas || !ctx) return;
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      drawWidth = window.innerWidth;
      drawHeight = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // 鼠标全局坐标追踪
    const mouse = {
      x: drawWidth / 2,
      y: drawHeight / 2,
      targetX: drawWidth / 2,
      targetY: drawHeight / 2,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 粒子定义
    const particleCount = 1000;
    const particles: Array<{
      r: number;        // 绕中心轨道半径
      theta: number;    // 当前轨道角度
      spread: number;   // 偏离轨道随机宽度 (形成星云尘埃质感)
      size: number;     // 粒子尺寸
      speed: number;    // 轨道旋转速度
      waveOffset: number; // 波动偏移量
      color: string;    // 星色
    }> = [];

    // 初始化星云尘埃粒子，中央留出虚化黑洞（Void）
    for (let i = 0; i < particleCount; i++) {
      // 轨道半径偏向外围分配，底线为 120px，防止遮挡中央卡片的核心视觉
      const r = Math.random() * 650 + 120;
      const theta = Math.random() * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 60;

      particles.push({
        r,
        theta,
        spread,
        size: Math.random() * 1.3 + 0.3,
        color: getRandomColor(),
        speed: (Math.random() * 0.0006 + 0.0002) * (Math.random() > 0.5 ? 1 : -1), // 慢速自转，有正反方向
        waveOffset: Math.random() * Math.PI * 2,
      });
    }

    function getRandomColor() {
      const r = Math.random();
      // 配色采用 Gemini 经典的星系霓虹光：靛蓝、深蓝、青绿、绛紫、以及高亮星光白
      if (r < 0.45) return "rgba(59, 130, 246, ALPHA)"; // 靛蓝
      if (r < 0.75) return "rgba(6, 182, 212, ALPHA)";  // 青色
      if (r < 0.90) return "rgba(168, 85, 247, ALPHA)"; // 紫色
      return "rgba(255, 255, 255, ALPHA)";              // 闪亮白星
    }

    // 渲染循环
    const render = () => {
      ctx.clearRect(0, 0, drawWidth, drawHeight);

      // 平滑鼠标阻尼过渡，防止突变
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      // 根据鼠标偏离中心位置，微调星系中央坐标，提供柔和的视差交互
      const cx = drawWidth / 2 + (mouse.x - drawWidth / 2) * 0.12;
      const cy = drawHeight / 2 + (mouse.y - drawHeight / 2) * 0.12;

      const time = Date.now() * 0.0008;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // 更新轨道自转
        p.theta += p.speed;

        // 星系螺旋波浪算法：利用正弦函数在椭圆轨道上叠加缓慢浮动的波形
        const stretchX = 1.9; // 扁平化星系结构 (扁平长轴)
        const wave = Math.sin(p.theta * 3 + time + p.waveOffset) * 20;

        const baseLineX = Math.cos(p.theta) * p.r * stretchX;
        const baseLineY = Math.sin(p.theta) * p.r + wave;

        // 计算最终粒子在 Canvas 中的 2D 坐标 (叠加星云横向散布)
        const finalX = cx + baseLineX + Math.cos(p.theta) * p.spread;
        const finalY = cy + baseLineY + Math.sin(p.theta) * p.spread;

        // 视口边缘粒子软虚化边缘淡出处理
        let edgeAlpha = 1;
        if (p.r > 550) {
          edgeAlpha = Math.max(0, 1 - (p.r - 550) / 200);
        }

        // 只有在屏幕内才绘制，提升帧率性能
        if (finalX >= 0 && finalX <= drawWidth && finalY >= 0 && finalY <= drawHeight) {
          const finalOpacity = (edgeAlpha * p.size * 0.7).toFixed(3);
          ctx.fillStyle = p.color.replace("ALPHA", finalOpacity);
          ctx.beginPath();
          ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0 bg-transparent"
    />
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 表单状态
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 鼠标交互位置状态 (用于视差和聚光灯效果)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });

  // 获取回调 URL，默认是首页
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // 平滑缓动算法渲染鼠标位置，防止动画抖动，达到极度丝滑的交互体验
  useEffect(() => {
    let animationFrameId: number;
    const updatePosition = () => {
      setMousePos((prev) => {
        const dx = targetPos.x - prev.x;
        const dy = targetPos.y - prev.y;
        // 缓动系数，数值越小越平滑
        const ease = 0.08; 
        
        // 若位移极小则停止更新
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
          return targetPos;
        }
        
        return {
          x: prev.x + dx * ease,
          y: prev.y + dy * ease,
        };
      });
      animationFrameId = requestAnimationFrame(updatePosition);
    };
    
    animationFrameId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetPos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTargetPos({ x, y });
  };

  const handleMouseLeave = () => {
    // 鼠标移出时恢复至中心
    setTargetPos({ x: 50, y: 50 });
  };

  /**
   * 处理登录提交
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 基础验证
    if (!username.trim()) {
      setError("请输入登录名");
      return;
    }
    if (!password.trim()) {
      setError("请输入密码");
      return;
    }

    startTransition(async () => {
      try {
        const res = await signIn("credentials", {
          username: username.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (res?.error) {
          setError("登录失败，请检查登录名和密码");
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch (err) {
        console.error("登录错误:", err);
        setError("登录出错，请稍后重试");
      }
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 max-w-6xl w-full mx-auto items-center py-6 md:py-12 relative overflow-visible min-h-[80vh]"
    >
      {/* CSS 局部动画注入 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-cyan {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.15); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes float-purple {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-60px, 50px) scale(1.2); }
        }
        @keyframes float-pink {
          0%, 100% { transform: translate(0px, 0px) scale(0.9); }
          40% { transform: translate(50px, 40px) scale(1.1); }
          80% { transform: translate(-20px, -30px) scale(1); }
        }
        .animate-float-cyan {
          animation: float-cyan 22s infinite alternate ease-in-out;
        }
        .animate-float-purple {
          animation: float-purple 28s infinite alternate ease-in-out;
        }
        .animate-float-pink {
          animation: float-pink 25s infinite alternate ease-in-out;
        }
      `}} />

      {/* ===== 动态背景粒子渲染层 ===== */}
      <BackgroundParticles />

      {/* ===== 动态网格与交互流光背景层 ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {/* 1. 网格底板，随鼠标发生微弱的立体偏移 (视差效果) */}
        <div
          className="absolute inset-[-40px] bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:32px_32px] opacity-80"
          style={{
            transform: `translate(${(mousePos.x - 50) * 0.05}px, ${(mousePos.y - 50) * 0.05}px)`,
          }}
        />

        {/* 2. 动态彩色光环1 (青色 - 自动漂移 + 鼠标视差正向跟随) */}
        <div
          className="absolute left-[10%] top-[15%] pointer-events-none lg:block hidden"
          style={{
            transform: `translate(${(mousePos.x - 50) * 0.15}px, ${(mousePos.y - 50) * 0.15}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <div className="animate-float-cyan h-[450px] w-[450px] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        </div>

        {/* 3. 动态彩色光环2 (紫色 - 自动漂移 + 鼠标视差反向推移) */}
        <div
          className="absolute right-[5%] bottom-[15%] pointer-events-none lg:block hidden"
          style={{
            transform: `translate(${(mousePos.x - 50) * -0.12}px, ${(mousePos.y - 50) * -0.12}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <div className="animate-float-purple h-[500px] w-[500px] rounded-full bg-purple-500/[0.06] blur-[130px]" />
        </div>

        {/* 4. 动态彩色光环3 (粉色 - 辅助发光) */}
        <div
          className="absolute left-[40%] top-[40%] pointer-events-none lg:block hidden"
          style={{
            transform: `translate(${(mousePos.x - 50) * 0.08}px, ${(mousePos.y - 50) * -0.08}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <div className="animate-float-pink h-[350px] w-[350px] rounded-full bg-pink-500/[0.04] blur-[100px]" />
        </div>

        {/* 5. 交互聚光灯 (实时吸附在鼠标指针下方，照亮后方的玻璃态卡片) */}
        <div
          className="absolute pointer-events-none w-[550px] h-[550px] rounded-full bg-gradient-to-r from-indigo-500/5 via-cyan-500/3 to-purple-500/5 blur-[100px] lg:block hidden"
          style={{
            left: `${mousePos.x}%`,
            top: `${mousePos.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* ===== 左侧：Gemini 风格的品牌介绍与 Slogan ===== */}
      <div className="lg:col-span-7 flex flex-col justify-center text-left space-y-8 pr-0 lg:pr-12 relative z-10 select-none">
        <div className="space-y-4">
          {/* 徽章标 */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3.5 py-1 text-xs text-indigo-300 backdrop-blur-sm tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <span>SDLC 研发效能平台 v2.0</span>
          </div>

          {/* 核心标语 */}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            重塑软件研发周期的
            <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-indigo-300 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              无限效能边界
            </span>
          </h1>

          <p className="text-sm md:text-base text-muted-foreground/80 leading-relaxed max-w-xl">
            基于莫比乌斯环设计理念，实现需求、计划、开发、测试、部署与运维的极致连贯性，消除环节孤岛，为团队带来无缝的一体化协同和卓越的业务敏捷性。
          </p>
        </div>

        {/* 关键特性三条 */}
        <div className="space-y-5 max-w-lg">
          <div className="flex gap-4 items-start group cursor-default">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-cyan-400 shadow-inner group-hover:border-cyan-500/20 transition-all duration-300">
              <Compass className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">需求与计划深度衔接</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                全周期的 WBS 计划管理与团队/个人甘特图，确保迭代交付节点精确掌控。
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start group cursor-default">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-purple-400 shadow-inner group-hover:border-purple-500/20 transition-all duration-300">
              <Rocket className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">自动化部署平滑交付</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                多阶段构建优化，一键自动化 CI/CD 发布与多环境无缝平滑切换。
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start group cursor-default">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-teal-400 shadow-inner group-hover:border-teal-500/20 transition-all duration-300">
              <Cpu className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">运维调优与全天候审计</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                全站用户审计追踪与多指标运行日志分析，保障线上环境的绝对平稳。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 右侧：Gemini 风格的极简玻璃态登录卡片 ===== */}
      <div className="lg:col-span-5 flex justify-center w-full relative z-10">
        <div className="glass-strong w-full max-w-md rounded-3xl p-8 border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-500 hover:border-white/15">
          
          {/* 图标与欢迎信息 */}
          <div className="mb-8 text-center flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/10 shadow-lg shadow-black/20 backdrop-blur-md hover:scale-105 transition-transform duration-300">
              {/* 启用彩色版的莫比乌斯环图标，在黑卡背景下惊艳夺目 */}
              <SdlcIcon size={56} colored={true} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">欢迎回来</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              请输入您的账户凭证以登录效能工作台
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400 border border-red-500/15">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 登录名 */}
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="block text-xs font-medium text-muted-foreground/80 tracking-wider uppercase"
              >
                登录名
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/60 transition-colors" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="请输入登录名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-white/[0.02] py-3 pl-11 pr-4 text-sm text-white placeholder-muted-foreground/40 transition-all focus:border-indigo-500/40 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground/80 tracking-wider uppercase"
              >
                密码
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/60 transition-colors" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-white/[0.02] py-3 pl-11 pr-4 text-sm text-white placeholder-muted-foreground/40 transition-all focus:border-indigo-500/40 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all duration-300 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                  <span>正在登录...</span>
                </>
              ) : (
                <>
                  <span>立即登录</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* 占位符结构 */}
          <div className="mt-6" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
