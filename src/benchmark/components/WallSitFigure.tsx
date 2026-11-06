import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { B } from '../theme';

/** Simple drawn wall-sit figure (the photo set has none). */
export function WallSitFigure({ size = 56, oneLeg = false }: { size?: number; oneLeg?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" accessibilityLabel="Wall sit">
      <Rect x={0} y={0} width={56} height={56} rx={8} fill={B.greenSoft} />
      <Line x1={10} y1={6} x2={10} y2={50} stroke={B.muted} strokeWidth={3} />
      <Line x1={6} y1={50} x2={52} y2={50} stroke={B.muted} strokeWidth={2} />
      <Circle cx={18} cy={13} r={5} fill={B.green} />
      <Line x1={16} y1={19} x2={16} y2={33} stroke={B.green} strokeWidth={4} strokeLinecap="round" />
      <Line x1={16} y1={33} x2={32} y2={33} stroke={B.green} strokeWidth={4} strokeLinecap="round" />
      <Line x1={32} y1={33} x2={32} y2={48} stroke={B.green} strokeWidth={4} strokeLinecap="round" />
      {oneLeg ? (
        <Line x1={30} y1={33} x2={44} y2={30} stroke={B.green} strokeWidth={4} strokeLinecap="round" />
      ) : null}
    </Svg>
  );
}
