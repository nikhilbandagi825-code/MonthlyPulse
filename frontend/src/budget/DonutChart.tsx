import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

export type DonutSegment = { label: string; value: number; color: string };

export default function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 168,
  strokeWidth = 26,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = total > 0 ? s.value / total : 0;
      const dash = fraction * circumference;
      const arc = {
        color: s.color,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offset,
        key: s.label,
      };
      offset += dash;
      return arc;
    });

  return (
    <View testID="donut-chart" style={styles.wrap}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle cx={cx} cy={cy} r={radius} stroke="#F0F5F1" strokeWidth={strokeWidth} fill="none" />
          {arcs.map((a) => (
            <Circle
              key={a.key}
              cx={cx}
              cy={cy}
              r={radius}
              stroke={a.color}
              strokeWidth={strokeWidth}
              strokeDasharray={a.dashArray}
              strokeDashoffset={a.dashOffset}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerValue}>{centerValue}</Text>
        <Text style={styles.centerLabel}>{centerLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  centerValue: { color: "#1B2A22", fontSize: 22, fontWeight: "700" },
  centerLabel: { color: "#6E8577", fontSize: 12, fontWeight: "600", marginTop: 2 },
});
