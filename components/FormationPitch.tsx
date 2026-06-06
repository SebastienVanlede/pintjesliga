'use client';
import { Position, PickedPlayer, FORMATION_DOTS, FORMATION_POSITIONS, Formation } from '@/lib/types';

const PITCH_W = 330;
const PITCH_H = 440;
const R = 19;

interface Props {
  formation: Formation;
  pickedByIndex: Record<number, PickedPlayer>;
  eligibleIndices?: Set<number>;
  onAssign?: (i: number) => void;
  size?: 'md' | 'lg';
}

export default function FormationPitch({
  formation,
  pickedByIndex,
  eligibleIndices = new Set(),
  onAssign,
  size = 'md',
}: Props) {
  const dots = FORMATION_DOTS[formation];
  const positions = FORMATION_POSITIONS[formation];
  const scale = size === 'lg' ? 1.25 : 1;
  const W = PITCH_W * scale;
  const H = PITCH_H * scale;
  const scaleX = W / 60;
  const scaleY = H / 80;
  const r = R * scale;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: 10, border: '1px solid var(--border)', maxWidth: '100%' }}
    >
      {/* Stripes */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="0" y={i * (H / 8)} width={W} height={H / 8}
          fill={i % 2 === 0 ? '#2D5A27' : '#2A5424'} />
      ))}
      {/* Outline */}
      <rect x="5" y="5" width={W - 10} height={H - 10}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      {/* Center line */}
      <line x1="5" y1={H / 2} x2={W - 5} y2={H / 2}
        stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      {/* Center circle */}
      <circle cx={W / 2} cy={H / 2} r={38 * scale}
        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      <circle cx={W / 2} cy={H / 2} r={2 * scale} fill="rgba(255,255,255,0.6)" />
      {/* Top penalty area */}
      <rect x={W * 0.22} y="5" width={W * 0.56} height={H * 0.16}
        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <rect x={W * 0.36} y="5" width={W * 0.28} height={H * 0.065}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      {/* Bottom penalty area */}
      <rect x={W * 0.22} y={H * 0.84} width={W * 0.56} height={H * 0.16}
        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <rect x={W * 0.36} y={H * 0.935} width={W * 0.28} height={H * 0.065}
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />

      {/* Nodes */}
      {dots.map(([dx, dy], i) => {
        const cx = dx * scaleX;
        const cy = dy * scaleY;
        const pick = pickedByIndex[i];
        const isEligible = eligibleIndices.has(i);
        const isClickable = isEligible && !!onAssign;
        const pos = positions[i];

        if (pick) {
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r}
                fill={pick.teamPrimaryColor}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={1.8 * scale} />
              <text x={cx} y={cy - 5 * scale} textAnchor="middle"
                fontSize={7 * scale} fill="white" fontWeight="700">
                {pick.player.name.split(' ').pop()?.slice(0, 9)}
              </text>
              <text x={cx} y={cy + 5 * scale} textAnchor="middle"
                fontSize={8.5 * scale} fill="rgba(255,255,255,0.95)"
                fontFamily="var(--font-display)">
                {pick.player.overall}
              </text>
              <text x={cx} y={cy + 13 * scale} textAnchor="middle"
                fontSize={5.5 * scale} fill="rgba(255,255,255,0.65)">
                {pos}
              </text>
            </g>
          );
        }

        if (isClickable) {
          return (
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => onAssign!(i)}>
              <circle cx={cx} cy={cy} r={r} fill="rgba(212,148,10,0.35)"
                stroke="#D4940A" strokeWidth={2.5 * scale}>
                <animate attributeName="r"
                  values={`${r - scale};${r + 2 * scale};${r - scale}`}
                  dur="1.1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85;1;0.85" dur="1.1s" repeatCount="indefinite" />
              </circle>
              <text x={cx} y={cy + 3 * scale} textAnchor="middle"
                fontSize={8 * scale} fill="#D4940A" fontFamily="var(--font-display)">
                {pos}
              </text>
            </g>
          );
        }

        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r - 2 * scale}
              fill="rgba(0,0,0,0.4)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.2 * scale}
              opacity={eligibleIndices.size > 0 ? 0.35 : 0.85} />
            <text x={cx} y={cy + 3 * scale} textAnchor="middle"
              fontSize={7.5 * scale} fill="rgba(255,255,255,0.65)"
              fontFamily="var(--font-display)">
              {pos}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
