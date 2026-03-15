import { Group, Indicator, Paper, Text, UnstyledButton, useMantineColorScheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useLocation, useNavigate } from "react-router-dom";
import { DOCK_NAV_ITEMS, isPrimaryPathActive } from "./primaryNav";
import {
  FLOATING_DOCK_HEIGHT,
  getDockInset,
  getGlassChromeStyle,
  getPillStyle,
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
          p={isCompact ? 4 : 5}
          style={{
            ...getGlassChromeStyle(isDark),
            width: "fit-content",
            maxWidth: "calc(100vw - 1.5rem)",
            minHeight: FLOATING_DOCK_HEIGHT,
            position: "relative",
            overflow: "hidden",
            pointerEvents: "all",
          }}
        >
          <Group gap={isCompact ? 2 : 4} wrap="nowrap" style={{ position: "relative", zIndex: 1 }}>
            {DOCK_NAV_ITEMS.map((item, index) => {
              const active = isPrimaryPathActive(location.pathname, item.path);
              const itemDueCount =
                item.path === "/learn"
                  ? learnDueCount
                  : item.path === "/review"
                    ? reviewDueCount
                    : dueCount;
              return (
                <Group key={item.path} gap={isCompact ? 2 : 4} wrap="nowrap">
                  {index > 0 && (
                    <Text
                      aria-hidden="true"
                      c={isDark ? "rgba(255,255,255,0.28)" : "rgba(16,24,32,0.24)"}
                      size="sm"
                      style={{ lineHeight: 1 }}
                    >
                      |
                    </Text>
                  )}
                  <UnstyledButton
                    aria-current={active ? "page" : undefined}
                    aria-label={`Go to ${item.label}`}
                    onClick={() => navigate(item.path)}
                    style={{
                      minHeight: FLOATING_DOCK_HEIGHT - 10,
                      padding: isCompact ? "6px 8px" : "7px 10px",
                      borderRadius: 999,
                      ...getPillStyle(isDark, active),
                    }}
                  >
                    <Group gap={6} wrap="nowrap" justify="center" align="center">
                      <Indicator
                        disabled={!item.showDue || itemDueCount === 0}
                        color="grape"
                        offset={4}
                        size={8}
                        processing
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transform: "translateY(1px)",
                          }}
                        >
                          <item.icon size={isCompact ? 15 : 16} style={{ display: "block" }} />
                        </span>
                      </Indicator>
                      <Text
                        size={isCompact ? "11px" : "xs"}
                        fw={active ? 700 : 500}
                        c={active ? (isDark ? "gray.0" : "dark.7") : (isDark ? "gray.5" : "gray.6")}
                        ta="center"
                        style={{ lineHeight: 1.2, whiteSpace: "nowrap" }}
                      >
                        {item.label}
                      </Text>
                    </Group>
                  </UnstyledButton>
                </Group>
              );
            })}
          </Group>
        </Paper>
      </Group>
    </div>
  );
}
