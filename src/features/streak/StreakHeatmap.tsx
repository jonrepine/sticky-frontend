import { useMemo } from "react";
import { Group, Stack, Text } from "@mantine/core";
import type { DailyEngagementPoint } from "../../types";

interface HeatmapCell {
  key: string;
  dateLabel: string;
  totalCount: number;
  level: 0 | 1 | 2 | 3 | 4;
  inRange: boolean;
}

interface StreakHeatmapProps {
  points: DailyEngagementPoint[];
  isDark: boolean;
  compact?: boolean;
  windowDays?: number;
}

function toUtcDate(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function addUtcDays(input: Date, days: number): Date {
  const next = new Date(input);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function formatDateLabel(input: Date): string {
  return input.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function getColorByLevel(level: 0 | 1 | 2 | 3 | 4, isDark: boolean): string {
  const darkScale = ["rgba(171, 190, 166, 0.08)", "#224327", "#2e6a35", "#3e9148", "#59bc66"] as const;
  const lightScale = ["rgba(122, 148, 115, 0.1)", "#d9efd2", "#a9da9f", "#70bf79", "#3a984d"] as const;
  return (isDark ? darkScale[level] : lightScale[level]) ?? (isDark ? darkScale[0] : lightScale[0]);
}

function getWindowLabel(windowDays: number): string {
  if (windowDays <= 93) return "Last 3 months";
  if (windowDays <= 186) return "Last 6 months";
  return "Last 12 months";
}

export function StreakHeatmap({
  points,
  isDark,
  compact = false,
  windowDays = 365,
}: StreakHeatmapProps) {
  const pointMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const point of points) {
      const asDate = new Date(point.date);
      if (Number.isNaN(asDate.getTime())) continue;
      map.set(toDateKey(toUtcDate(asDate)), point.totalCount || 0);
    }
    return map;
  }, [points]);

  const { weeks, maxCount, totalEngagement } = useMemo(() => {
    const today = toUtcDate(new Date());
    const rangeStart = addUtcDays(today, -(windowDays - 1));
    const startWeekAnchor = addUtcDays(rangeStart, -rangeStart.getUTCDay());
    const endWeekAnchor = addUtcDays(today, 6 - today.getUTCDay());

    const allCells: HeatmapCell[] = [];
    let highestCount = 0;
    let aggregateCount = 0;

    for (let cursor = startWeekAnchor; cursor <= endWeekAnchor; cursor = addUtcDays(cursor, 1)) {
      const key = toDateKey(cursor);
      const inRange = cursor >= rangeStart && cursor <= today;
      const count = inRange ? pointMap.get(key) ?? 0 : 0;
      if (inRange) {
        highestCount = Math.max(highestCount, count);
        aggregateCount += count;
      }
      allCells.push({
        key,
        dateLabel: formatDateLabel(cursor),
        totalCount: count,
        level: 0,
        inRange,
      });
    }

    const resolvedMax = Math.max(1, highestCount);
    const leveledCells = allCells.map((cell) => {
      if (!cell.inRange || cell.totalCount <= 0) return { ...cell, level: 0 as const };
      const ratio = cell.totalCount / resolvedMax;
      const level = ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;
      return { ...cell, level: level as 1 | 2 | 3 | 4 };
    });

    const groupedWeeks: HeatmapCell[][] = [];
    for (let i = 0; i < leveledCells.length; i += 7) {
      groupedWeeks.push(leveledCells.slice(i, i + 7));
    }

    return {
      weeks: groupedWeeks,
      maxCount: highestCount,
      totalEngagement: aggregateCount,
    };
  }, [pointMap, windowDays]);

  const cellSize = compact ? 10 : 11;

  return (
    <Stack gap={6}>
      <div
        style={{
          display: "flex",
          gap: compact ? 3 : 4,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {weeks.map((week, weekIndex) => (
          <div
            key={`week-${weekIndex}`}
            style={{
              display: "grid",
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              gap: compact ? 2 : 3,
            }}
          >
            {week.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.dateLabel}: ${cell.totalCount} engagements`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 3,
                  background: getColorByLevel(cell.level, isDark),
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(18,36,20,0.08)",
                  opacity: cell.inRange ? 1 : 0.25,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="xs" c="dimmed">
          {getWindowLabel(windowDays)} · {totalEngagement} engagements
        </Text>
        <Group gap={4} wrap="nowrap">
          <Text size="10px" c="dimmed">
            Less
          </Text>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={`legend-${level}`}
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                background: getColorByLevel(level as 0 | 1 | 2 | 3 | 4, isDark),
                border: isDark
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(18,36,20,0.08)",
              }}
            />
          ))}
          <Text size="10px" c="dimmed">
            More
          </Text>
        </Group>
      </Group>

      <Text size="10px" c="dimmed">
        Peak day: {maxCount} engagements
      </Text>
    </Stack>
  );
}
