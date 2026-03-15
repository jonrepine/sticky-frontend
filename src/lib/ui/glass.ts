import type { CSSProperties } from "react";

export const APP_MAX_WIDTH = 1040;
export const FEATURE_MAX_WIDTH = 840;
export const FLOATING_DOCK_HEIGHT = 56;
export const WORKSPACE_ACTIVE_WIDTH_DESKTOP = "min(52rem, 100%)";
export const WORKSPACE_ACTIVE_WIDTH_MOBILE = "calc(100% - 44px)";
export const WORKSPACE_PREVIEW_WIDTH_RATIO_DESKTOP = 0.92;
export const WORKSPACE_PREVIEW_WIDTH_RATIO_MOBILE = 0.8;
export const WORKSPACE_PREVIEW_PEEK_RATIO_DESKTOP = 0.15;
export const WORKSPACE_PREVIEW_PEEK_RATIO_MOBILE = 0.1;
const DOCK_INSET_PX_MOBILE = 24;
const DOCK_INSET_PX_DESKTOP = 20;
const DOCK_CLEARANCE_BUFFER_PX_MOBILE = 14;
const DOCK_CLEARANCE_BUFFER_PX_DESKTOP = 18;

export const wrapTextStyle: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

export function getDockInset(isCompact: boolean): string {
  return `calc(env(safe-area-inset-bottom, 0px) + ${
    isCompact ? DOCK_INSET_PX_MOBILE : DOCK_INSET_PX_DESKTOP
  }px)`;
}

export function getDockClearance(isCompact: boolean): string {
  const insetPx = isCompact ? DOCK_INSET_PX_MOBILE : DOCK_INSET_PX_DESKTOP;
  const bufferPx = isCompact ? DOCK_CLEARANCE_BUFFER_PX_MOBILE : DOCK_CLEARANCE_BUFFER_PX_DESKTOP;
  return `calc(env(safe-area-inset-bottom, 0px) + ${insetPx + FLOATING_DOCK_HEIGHT + bufferPx}px)`;
}

export function getWorkspaceActiveWidthToken(isCompact: boolean): string {
  return isCompact ? WORKSPACE_ACTIVE_WIDTH_MOBILE : WORKSPACE_ACTIVE_WIDTH_DESKTOP;
}

export function getWorkspacePreviewWidthPx(activeWidthPx: number, isCompact: boolean): number {
  const ratio = isCompact
    ? WORKSPACE_PREVIEW_WIDTH_RATIO_MOBILE
    : WORKSPACE_PREVIEW_WIDTH_RATIO_DESKTOP;
  return activeWidthPx * ratio;
}

export function getWorkspacePreviewRevealPx(previewWidthPx: number, isCompact: boolean): number {
  const ratio = isCompact
    ? WORKSPACE_PREVIEW_PEEK_RATIO_MOBILE
    : WORKSPACE_PREVIEW_PEEK_RATIO_DESKTOP;
  return previewWidthPx * ratio;
}

export function getWorkspacePreviewDepth(isCompact: boolean): {
  scale: number;
  blurPx: number;
  opacity: number;
} {
  if (isCompact) {
    return { scale: 0.86, blurPx: 4.5, opacity: 0.76 };
  }

  return { scale: 0.95, blurPx: 5, opacity: 0.78 };
}

export function getCanvasStyle(isDark: boolean): CSSProperties {
  return {
    minHeight: "100dvh",
    backgroundColor: isDark ? "#111218" : "#f4f3ef",
    backgroundImage: isDark
      ? [
          "radial-gradient(circle at top left, rgba(133, 101, 211, 0.12), transparent 30%)",
          "radial-gradient(circle at top right, rgba(255, 255, 255, 0.04), transparent 24%)",
          "linear-gradient(180deg, #111218 0%, #171821 100%)",
        ].join(", ")
      : [
          "radial-gradient(circle at top left, rgba(220, 212, 248, 0.42), transparent 30%)",
          "radial-gradient(circle at top right, rgba(255, 255, 255, 0.82), transparent 24%)",
          "linear-gradient(180deg, #faf9f6 0%, #f1f0eb 100%)",
        ].join(", "),
    backgroundAttachment: "fixed",
  };
}

export function getGlassChromeStyle(isDark: boolean): CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.78)",
    background: isDark ? "rgba(24, 26, 34, 0.56)" : "rgba(252, 252, 248, 0.78)",
    boxShadow: isDark
      ? "0 12px 30px rgba(0, 0, 0, 0.22), 0 0 18px rgba(126, 101, 199, 0.08)"
      : "0 18px 34px rgba(110, 116, 141, 0.12)",
    backdropFilter: "blur(18px) saturate(1.18)",
  };
}

export function getGlassPanelStyle(
  isDark: boolean,
  emphasis: "base" | "hero" = "base"
): CSSProperties {
  const strong = emphasis === "hero";

  return {
    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.82)",
    background: isDark
      ? strong
        ? "rgba(26, 29, 37, 0.74)"
        : "rgba(26, 29, 37, 0.62)"
      : strong
        ? "rgba(252, 252, 248, 0.84)"
        : "rgba(249, 248, 243, 0.78)",
    boxShadow: isDark
      ? strong
        ? "0 24px 64px rgba(0, 0, 0, 0.28), 0 0 22px rgba(125, 97, 204, 0.06)"
        : "0 20px 52px rgba(0, 0, 0, 0.22)"
      : strong
        ? "0 24px 58px rgba(119, 126, 146, 0.14)"
        : "0 16px 40px rgba(119, 126, 146, 0.1)",
    backdropFilter: strong ? "blur(20px) saturate(1.14)" : "blur(16px) saturate(1.1)",
  };
}

export function getWorkspaceSurfaceStyle(isDark: boolean): CSSProperties {
  return {
    ...getGlassPanelStyle(isDark, "hero"),
    overflow: "hidden",
    position: "relative",
  };
}

export function getGlassInsetStyle(isDark: boolean): CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.74)",
    background: isDark ? "rgba(255,255,255,0.038)" : "rgba(247, 246, 242, 0.9)",
    boxShadow: isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.04)"
      : "inset 0 1px 0 rgba(255,255,255,0.8)",
  };
}

export function getPillStyle(isDark: boolean, active = false): CSSProperties {
  return {
    minHeight: 34,
    borderRadius: 999,
    border: isDark
      ? `1px solid ${active ? "rgba(147,222,67,0.34)" : "rgba(255,255,255,0.02)"}`
      : `1px solid ${active ? "rgba(145,214,64,0.42)" : "rgba(255,255,255,0.04)"}`,
    background: active
      ? isDark
        ? "rgba(255,255,255,0.045)"
        : "rgba(255, 255, 255, 0.86)"
      : "transparent",
    boxShadow: active
      ? isDark
        ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(146, 219, 64, 0.08), 0 10px 22px rgba(70, 156, 31, 0.2)"
        : "0 8px 18px rgba(92, 176, 30, 0.14), 0 0 0 1px rgba(145, 214, 64, 0.08)"
      : "none",
  };
}

export function getSubtleSectionStyle(isDark: boolean): CSSProperties {
  return {
    border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(92, 112, 78, 0.2)",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(252, 251, 247, 0.95)",
    boxShadow: isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.03)"
      : "inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 16px rgba(63, 77, 53, 0.08)",
    backdropFilter: "blur(12px) saturate(1.05)",
  };
}

export function getInputSurfaceStyle(isDark: boolean): CSSProperties {
  return {
    borderColor: isDark ? "transparent" : "rgba(92, 112, 78, 0.16)",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 253, 249, 0.98)",
    boxShadow: isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.03)"
      : "inset 0 1px 0 rgba(255,255,255,0.92), 0 1px 2px rgba(71, 84, 61, 0.08)",
  };
}

export function getPrimaryActionStyle(isDark: boolean): CSSProperties {
  return {
    border: isDark ? "1px solid rgba(148,222,67,0.28)" : "1px solid rgba(146,214,64,0.3)",
    background: isDark
      ? "linear-gradient(180deg, rgba(31, 35, 28, 0.92), rgba(23, 27, 22, 0.9))"
      : "linear-gradient(180deg, rgba(253,253,250,0.98), rgba(246,245,241,0.96))",
    color: isDark ? "#eef6dd" : "#27310f",
    boxShadow: isDark
      ? "0 18px 34px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(148, 222, 67, 0.08), 0 0 28px rgba(84, 182, 26, 0.18)"
      : "0 16px 28px rgba(92, 176, 30, 0.12), 0 0 0 1px rgba(146, 214, 64, 0.08)",
    backdropFilter: "blur(12px) saturate(1.08)",
  };
}

export function getAiActionStyle(isDark: boolean): CSSProperties {
  return {
    border: isDark ? "1px solid rgba(153, 123, 220, 0.24)" : "1px solid rgba(186, 170, 232, 0.38)",
    background: isDark
      ? "linear-gradient(180deg, rgba(29, 31, 41, 0.92), rgba(24, 26, 35, 0.9))"
      : "linear-gradient(180deg, rgba(252, 252, 249, 0.98), rgba(244, 242, 248, 0.96))",
    color: isDark ? "#f2eefb" : "#302544",
    boxShadow: isDark
      ? "0 16px 28px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(163, 131, 234, 0.06), 0 0 24px rgba(124, 92, 205, 0.18)"
      : "0 14px 24px rgba(125, 110, 180, 0.12), 0 0 0 1px rgba(161, 142, 216, 0.08)",
    backdropFilter: "blur(12px) saturate(1.06)",
  };
}

export function getAiInputStyle(isDark: boolean): CSSProperties {
  return {
    borderColor: isDark ? "rgba(155, 126, 220, 0.16)" : "rgba(196, 181, 235, 0.42)",
    background: isDark ? "rgba(34, 31, 44, 0.58)" : "rgba(246, 243, 251, 0.96)",
    boxShadow: isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(161, 132, 228, 0.05)"
      : "inset 0 1px 0 rgba(255,255,255,0.88), 0 0 0 1px rgba(177, 157, 224, 0.08)",
  };
}
