import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { B } from '../theme';
import type { FigureKind } from '../types';

const LABELS: Record<FigureKind, string> = {
  wallsit: 'Wall sit on both legs',
  wallsit1: 'Wall sit on one leg',
  wallsquat: 'Squat facing a wall, arms overhead, toes a few inches from the wall',
  sled: 'Sled pushed between two cones 50 feet apart, then dragged back',
};

/**
 * Simple drawn pictures for tests the photo library (Free Exercise DB) has
 * nothing for. Drawn on a 56×56 grid and scaled to `size`.
 */
export function TestFigure({ kind, size = 56 }: { kind: FigureKind; size?: number }) {
  const limb = { stroke: B.green, strokeWidth: 4, strokeLinecap: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" accessibilityLabel={LABELS[kind]}>
      <Rect x={0} y={0} width={56} height={56} rx={8} fill={B.greenSoft} />
      {kind === 'wallsit' || kind === 'wallsit1' ? (
        <>
          <Line x1={10} y1={6} x2={10} y2={50} stroke={B.muted} strokeWidth={3} />
          <Line x1={6} y1={50} x2={52} y2={50} stroke={B.muted} strokeWidth={2} />
          <Circle cx={18} cy={13} r={5} fill={B.green} />
          <Line x1={16} y1={19} x2={16} y2={33} {...limb} />
          <Line x1={16} y1={33} x2={32} y2={33} {...limb} />
          <Line x1={32} y1={33} x2={32} y2={48} {...limb} />
          {kind === 'wallsit1' ? <Line x1={30} y1={33} x2={44} y2={30} {...limb} /> : null}
        </>
      ) : null}
      {kind === 'wallsquat' ? (
        <>
          {/* Wall on the right, the person facing it in a deep squat, arms overhead. */}
          <Line x1={47} y1={4} x2={47} y2={47} stroke={B.muted} strokeWidth={3} />
          <Line x1={4} y1={47} x2={50} y2={47} stroke={B.muted} strokeWidth={2} />
          <Circle cx={27} cy={17} r={4.5} fill={B.green} />
          <Line x1={24} y1={23} x2={18} y2={36} {...limb} />
          <Line x1={24} y1={23} x2={33} y2={5} {...limb} />
          <Line x1={18} y1={36} x2={32} y2={34} {...limb} />
          <Line x1={32} y1={34} x2={28} y2={45} {...limb} />
          <Line x1={26} y1={46} x2={35} y2={46} stroke={B.green} strokeWidth={3} strokeLinecap="round" />
          {/* Distance from the toes to the wall. */}
          <Line x1={36} y1={52} x2={46} y2={52} stroke={B.goldText} strokeWidth={2} />
          <Line x1={36} y1={50} x2={36} y2={54} stroke={B.goldText} strokeWidth={2} />
          <Line x1={46} y1={50} x2={46} y2={54} stroke={B.goldText} strokeWidth={2} />
        </>
      ) : null}
      {kind === 'sled' ? (
        <>
          <Line x1={4} y1={44} x2={52} y2={44} stroke={B.muted} strokeWidth={2} />
          {/* Cones at both ends. */}
          <Path d="M5 44 L9 32 L13 44 Z" fill={B.goldText} />
          <Path d="M43 44 L47 32 L51 44 Z" fill={B.goldText} />
          {/* Sled with its tall handles. */}
          <Rect x={21} y={37} width={14} height={6} rx={1} fill={B.green} />
          <Line x1={24} y1={37} x2={22} y2={27} stroke={B.green} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={32} y1={37} x2={30} y2={27} stroke={B.green} strokeWidth={2.5} strokeLinecap="round" />
          {/* Push out, drag back: one loop. */}
          <Path d="M12 12 H42 M37 7 L42 12 L37 17" stroke={B.green} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M44 22 H14 M19 17 L14 22 L19 27" stroke={B.text} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
    </Svg>
  );
}
