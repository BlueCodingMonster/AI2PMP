interface SdlcIconProps {
  size?: number;
  className?: string;
  colored?: boolean;
}

export default function SdlcIcon({ size = 24, className, colored = false }: SdlcIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {colored && (
          <>
            {/* 左半环渐变: 规划(Cyan) -> 设计(Blue) -> 开发(Purple) */}
            <linearGradient id="left-loop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            {/* 对角线1渐变: 开发(Purple) -> 测试(Pink) */}
            <linearGradient id="diag1-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* 右半环渐变: 测试(Pink) -> 部署(Orange) -> 运维(Teal) */}
            <linearGradient id="right-loop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* 对角线2渐变: 运维(Teal) -> 规划(Cyan) */}
            <linearGradient id="diag2-grad" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* 阴影滤镜，增强深度 */}
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </>
        )}

        {/* 3D扭转遮罩：遮挡对角线2，使对角线1在上方通过，形成3D交叉感 */}
        <mask id="crossing-mask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <path
            d="M 42,56 C 45,54 48,52 50,50 C 52,48 55,46 58,44"
            stroke="black"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
        </mask>
      </defs>

      {/* 底板微光效果 */}
      <circle cx="50" cy="50" r="46" fill="currentColor" opacity="0.03" />

      {/* 莫比乌斯环背景霓虹发光层 (仅在彩色模式下启用) */}
      {colored && (
        <g opacity="0.35" filter="url(#glow-filter)" strokeWidth="8" strokeLinecap="round">
          <path d="M 20,25 C 8,25 8,75 20,75" stroke="url(#left-loop-grad)" />
          <path d="M 80,75 C 68,75 58,62 50,50 C 42,38 32,25 20,25" stroke="url(#diag2-grad)" mask="url(#crossing-mask)" />
          <path d="M 20,75 C 32,75 42,62 50,50 C 58,38 68,25 80,25" stroke="url(#diag1-grad)" />
          <path d="M 80,25 C 92,25 92,75 80,75" stroke="url(#right-loop-grad)" />
        </g>
      )}

      {/* 莫比乌斯环实体精细层 */}
      <g strokeWidth="5" strokeLinecap="round">
        {/* 左半环 */}
        <path
          d="M 20,25 C 8,25 8,75 20,75"
          stroke={colored ? "url(#left-loop-grad)" : "currentColor"}
        />
        {/* 对角线2 (下层，被遮罩裁剪) */}
        <path
          d="M 80,75 C 68,75 58,62 50,50 C 42,38 32,25 20,25"
          stroke={colored ? "url(#diag2-grad)" : "currentColor"}
          mask="url(#crossing-mask)"
        />
        {/* 对角线1 (上层，直接画在上方) */}
        <path
          d="M 20,75 C 32,75 42,62 50,50 C 58,38 68,25 80,25"
          stroke={colored ? "url(#diag1-grad)" : "currentColor"}
        />
        {/* 右半环 */}
        <path
          d="M 80,25 C 92,25 92,75 80,75"
          stroke={colored ? "url(#right-loop-grad)" : "currentColor"}
        />
      </g>

      {/* 高光反光层 (微调粗细与位置，增加玻璃质感，仅在彩色模式下展示) */}
      {colored && (
        <g stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.15">
          <path d="M 20,24 C 9,24 9,74 20,74" />
          <path d="M 80,24 C 91,24 91,74 80,74" />
        </g>
      )}
    </svg>
  );
}
