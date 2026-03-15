import type { CSSProperties } from "react";
import { Group, Paper, Text, UnstyledButton, useMantineColorScheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useLocation, useNavigate } from "react-router-dom";
import { DOCK_NAV_ITEMS, isPrimaryPathActive } from "./primaryNav";
import {
  FLOATING_DOCK_HEIGHT,
  getDockInset,
  getGlassChromeStyle,
} from "../lib/ui/glass";

interface FloatingDockProps {
  dueCount: number;
  learnDueCount: number;
  reviewDueCount: number;
}

export function FloatingDock({ dueCount, learnDueCount, reviewDueCount }: FloatingDockProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme } = useMantineColorScheme();
  const isCompact = !!useMediaQuery("(max-width: 36em)");
  const isDark = colorScheme === "dark";
  const railWidth = isCompact ? "min(20.75rem, calc(100vw - 1.25rem))" : "fit-content";

  const getDockButtonStyle = (active: boolean): CSSProperties => ({
    position: "relative",
    flex: isCompact ? 1 : undefined,
    minWidth: isCompact ? 0 : active ? 96 : 84,
    minHeight: isCompact ? 50 : 42,
    padding: isCompact ? "6px 8px 7px" : "8px 12px",
    borderRadius: 999,
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "auto auto",
    gridTemplateRows: isCompact ? "20px 12px" : "1fr",
    alignItems: "center",
    justifyItems: "center",
    columnGap: isCompact ? 0 : 8,
    rowGap: isCompact ? 2 : 0,
    border: active
      ? isDark
        ? "1px solid rgba(151, 226, 73, 0.34)"
        : "1px solid rgba(142, 214, 61, 0.38)"
      : isDark
        ? "1px solid rgba(255,255,255,0.03)"
        : "1px solid rgba(255,255,255,0.12)",
    background: active
      ? isDark
        ? "linear-gradient(180deg, rgba(35, 39, 33, 0.96), rgba(23, 27, 22, 0.94))"
        : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,247,243,0.96))"
      : isDark
        ? "rgba(255,255,255,0.02)"
        : "rgba(255,255,255,0.34)",
    boxShadow: active
      ? isDark
        ? "0 16px 28px rgba(0,0,0,0.22), 0 0 0 1px rgba(150, 226, 72, 0.08), 0 10px 24px rgba(81, 168, 28, 0.18)"
        : "0 10px 20px rgba(94, 180, 31, 0.16), 0 0 0 1px rgba(146, 214, 64, 0.08)"
      : "none",
    transition:
      "transform 140ms ease, background 140ms ease, border-color 140ms ease, box-shadow 160ms ease",
  });

  const getIconPlateStyle = (active: boolean): CSSProperties => ({
    position: "relative",
    width: isCompact ? 22 : 22,
    height: isCompact ? 22 : 22,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: active
      ? isDark
        ? "rgba(151, 226, 73, 0.12)"
        : "rgba(146, 214, 64, 0.12)"
      : "transparent",
    boxShadow: active
      ? isDark
        ? "inset 0 1px 0 rgba(255,255,255,0.06)"
        : "inset 0 1px 0 rgba(255,255,255,0.72)"
      : "none",
  });

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: getDockInset(isCompact),
        zIndex: 240,
        pointerEvents: "none",
      }}
    >
      <Group justify="center" px={isCompact ? "xs" : "md"}>
        <Paper
          radius={999}
          p={isCompact ? 4 : 6}
          style={{
            ...getGlassChromeStyle(isDark),
            width: railWidth,
            maxWidth: "calc(100vw - 1.25rem)",
            minHeight: FLOATING_DOCK_HEIGHT,
            position: "relative",
            overflow: "visible",
            pointerEvents: "all",
            boxShadow: isDark
              ? "0 22px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "0 18px 34px rgba(59, 74, 47, 0.14), inset 0 1px 0 rgba(255,255,255,0.76)",
          }}
        >
          <Group
            gap={isCompact ? 4 : 6}
            wrap="nowrap"
            style={{
              position: "relative",
              zIndex: 1,
              width: isCompact ? "100%" : "auto",
              alignItems: "stretch",
            }}
          >
            {DOCK_NAV_ITEMS.map((item) => {
              const active = isPrimaryPathActive(location.pathname, item.path);
              const itemDueCount =
                item.path === "/learn"
                  ? learnDueCount
                  : item.path === "/review"
                    ? reviewDueCount
                    : dueCount;
              return (
                <UnstyledButton
                  key={item.path}
                  aria-current={active ? "page" : undefined}
                  aria-label={`Go to ${item.label}`}
                  onClick={() => navigate(item.path)}
                  style={getDockButtonStyle(active)}
                >
                  <span style={getIconPlateStyle(active)}>
                    {item.showDue && itemDueCount > 0 ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: isCompact ? 0 : -2,
                          right: isCompact ? 0 : -2,
                          width: isCompact ? 7 : 8,
                          height: isCompact ? 7 : 8,
                          borderRadius: 999,
                          background: isDark ? "#9BE446" : "#7CC819",
                          boxShadow: isDark
                            ? "0 0 0 2px rgba(19, 23, 18, 0.9)"
                            : "0 0 0 2px rgba(255,255,255,0.96)",
                        }}
                      />
                    ) : null}
                    <item.icon
                      size={isCompact ? 15 : 16}
                      style={{
                        display: "block",
                        color: active
                          ? isDark
                            ? "#f7fbe9"
                            : "#1d2413"
                          : isDark
                            ? "rgba(235, 240, 225, 0.8)"
                            : "rgba(35, 40, 28, 0.72)",
                      }}
                    />
                  </span>
                  <Text
                      size={isCompact ? "9px" : "xs"}
                    fw={active ? 700 : 600}
                    c={active ? (isDark ? "gray.0" : "dark.8") : (isDark ? "gray.4" : "dark.4")}
                    ta="center"
                    style={{
                      lineHeight: isCompact ? 1 : 1,
                      letterSpacing: isCompact ? "0.01em" : "0.005em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Group>
        </Paper>
      </Group>
    </div>
  );
}
