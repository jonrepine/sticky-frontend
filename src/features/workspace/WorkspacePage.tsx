import { useEffect, useRef, useState } from "react";
import type { ReactNode, Ref, TouchEventHandler } from "react";
import { Paper, UnstyledButton, useMantineColorScheme } from "@mantine/core";
import { useElementSize, useMediaQuery, useViewportSize } from "@mantine/hooks";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { NewPage } from "../new/NewPage";
import { StudySession } from "../review/StudySession";
import {
  FEATURE_MAX_WIDTH,
  getWorkspaceActiveWidthToken,
  getWorkspacePreviewDepth,
  getWorkspacePreviewRevealPx,
  getWorkspacePreviewWidthPx,
  getWorkspaceSurfaceStyle,
} from "../../lib/ui/glass";
import { WORKSPACE_NAV_ITEMS, type WorkspaceNavItem } from "../../components/primaryNav";

const SWIPE_THRESHOLD = 52;
const DESKTOP_ACTIVE_MAX_WIDTH_PX = 832;
const MOBILE_ACTIVE_GUTTER_PX = 44;
const MIN_ACTIVE_WIDTH_PX = 280;
const MOBILE_PEEK_MIN_PX = 18;
const MOBILE_PEEK_PREFERRED_MIN_PX = 20;
const MOBILE_PEEK_PREFERRED_MAX_PX = 24;
const DESKTOP_EDGE_REVEAL_MIN_PX = 84;
const DESKTOP_EDGE_REVEAL_MAX_PX = 120;
const MAX_DRAG_DELTA_PX = 96;
const IDLE_DRIFT_PX = 5;

interface StageGeometry {
  activeWidthPx: number;
  previewWidthPx: number;
  revealWidthPx: number;
  laneWidthPx: number;
}

interface WorkspaceStageProps {
  stageRef: Ref<HTMLDivElement>;
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  onTouchMove: TouchEventHandler<HTMLDivElement>;
  onTouchEnd: TouchEventHandler<HTMLDivElement>;
  onTouchCancel: TouchEventHandler<HTMLDivElement>;
  isCompact: boolean;
  children: ReactNode;
}

interface WorkspaceActiveLaneProps {
  laneRef: Ref<HTMLDivElement>;
  isCompact: boolean;
  slideDirection: number;
  activePath: string;
  prefersReducedMotion: boolean;
  dragDeltaX: number;
  isDragging: boolean;
  children: ReactNode;
}

interface PreviewLaneProps {
  side: "left" | "right";
  section: WorkspaceNavItem | null;
  geometry: StageGeometry;
  isCompact: boolean;
  isDark: boolean;
  dragProgress: number;
  dragDeltaX: number;
  isDragging: boolean;
  idleDriftPx: number;
  isIdleSettling: boolean;
  onNavigate: (path: WorkspaceNavItem["path"]) => void;
  renderSurface: (section: WorkspaceNavItem, isActive: boolean) => ReactNode;
}

interface WorkspacePreviewEdgeProps {
  side: "left" | "right";
  section: WorkspaceNavItem;
  geometry: StageGeometry;
  isCompact: boolean;
  isDark: boolean;
  edgeRevealWidthPx: number;
  previewTranslatePx: number;
  previewScale: number;
  previewBlurPx: number;
  previewOpacity: number;
  transitionMs: number;
  onNavigate: (path: WorkspaceNavItem["path"]) => void;
  renderSurface: (section: WorkspaceNavItem, isActive: boolean) => ReactNode;
}

interface WorkspacePreviewWingProps {
  side: "left" | "right";
  section: WorkspaceNavItem;
  geometry: StageGeometry;
  wingWidthPx: number;
  previewTranslatePx: number;
  previewScale: number;
  wingBlurPx: number;
  wingOpacity: number;
  transitionMs: number;
  renderSurface: (section: WorkspaceNavItem, isActive: boolean) => ReactNode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function WorkspaceStage({
  stageRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  isCompact,
  children,
}: WorkspaceStageProps) {
  return (
    <div
      ref={stageRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{
        position: "relative",
        minHeight: "100%",
        paddingTop: isCompact ? 2 : 8,
        overflow: "visible",
      }}
    >
      {children}
    </div>
  );
}

function WorkspaceActiveLane({
  laneRef,
  isCompact,
  slideDirection,
  activePath,
  prefersReducedMotion,
  dragDeltaX,
  isDragging,
  children,
}: WorkspaceActiveLaneProps) {
  const activeDragShiftPx = isDragging ? dragDeltaX * 0.22 : 0;
  
  // Simplified animations for mobile performance
  const shouldAnimate = !prefersReducedMotion && !isCompact;

  return (
    <div
      ref={laneRef}
      style={{
        position: "relative",
        zIndex: 2,
        width: getWorkspaceActiveWidthToken(isCompact),
        maxWidth: FEATURE_MAX_WIDTH,
        margin: "0 auto",
      }}
    >
      <AnimatePresence initial={false} custom={slideDirection} mode="wait">
        <motion.div
          key={activePath}
          custom={slideDirection}
          initial={
            shouldAnimate
              ? {
                  opacity: 0.92,
                  x: slideDirection >= 0 ? 32 : -32,
                }
              : { opacity: 1 }
          }
          animate={{
            opacity: 1,
            x: activeDragShiftPx,
            transition: isDragging
              ? { duration: 0.05, ease: "linear" }
              : shouldAnimate
                ? { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
                : { duration: 0 },
          }}
          exit={
            shouldAnimate
              ? {
                  opacity: 0.85,
                  x: slideDirection >= 0 ? -20 : 20,
                  transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
                }
              : { opacity: 1 }
          }
          style={{ width: "100%" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WorkspacePreviewEdge({
  side,
  section,
  geometry,
  isCompact,
  isDark,
  edgeRevealWidthPx,
  previewTranslatePx,
  previewScale,
  previewBlurPx,
  previewOpacity,
  transitionMs,
  onNavigate,
  renderSurface,
}: WorkspacePreviewEdgeProps) {
  const anchoredSide = side === "left" ? { right: 0 } : { left: 0 };
  const edgeLightStyle =
    side === "left"
      ? { right: 0, background: "linear-gradient(to left, rgba(143, 221, 66, 0.2), transparent)" }
      : { left: 0, background: "linear-gradient(to right, rgba(143, 221, 66, 0.2), transparent)" };

  return (
    <UnstyledButton
      aria-label={`Open ${section.label}`}
      onClick={() => onNavigate(section.path)}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: edgeRevealWidthPx,
        overflow: isCompact ? "hidden" : "visible",
        pointerEvents: "all",
        ...anchoredSide,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          width: geometry.previewWidthPx,
          borderRadius: isCompact ? 30 : 40,
          transform: `translateX(${previewTranslatePx}px) scale(${previewScale})`,
          transformOrigin: side === "left" ? "right top" : "left top",
          opacity: previewOpacity,
          filter: `blur(${previewBlurPx}px) saturate(0.92)`,
          transition: `transform ${transitionMs}ms ease-out, opacity 220ms ease, filter 220ms ease`,
          boxShadow: isDark
            ? "0 24px 60px rgba(0, 0, 0, 0.24), 0 0 26px rgba(127, 98, 196, 0.08)"
            : "0 24px 64px rgba(109, 96, 145, 0.14)",
          ...anchoredSide,
        }}
      >
        <div inert aria-hidden="true" style={{ pointerEvents: "none" }}>
          {renderSurface(section, false)}
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: isCompact ? 30 : 40,
            background: isDark
              ? "linear-gradient(180deg, rgba(11, 13, 20, 0.12), rgba(16, 18, 28, 0.34))"
              : "linear-gradient(180deg, rgba(251, 250, 247, 0.08), rgba(234, 230, 244, 0.18))",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: isCompact ? 8 : 10,
          bottom: isCompact ? 8 : 10,
          width: 8,
          opacity: isCompact ? 0.24 : 0.18,
          pointerEvents: "none",
          ...edgeLightStyle,
        }}
      />
    </UnstyledButton>
  );
}

function WorkspacePreviewWing({
  side,
  section,
  geometry,
  wingWidthPx,
  previewTranslatePx,
  previewScale,
  wingBlurPx,
  wingOpacity,
  transitionMs,
  renderSurface,
}: WorkspacePreviewWingProps) {
  if (wingWidthPx <= 0) return null;

  const wingMaskGradient =
    side === "left"
      ? "linear-gradient(to left, rgba(0,0,0,0.86), rgba(0,0,0,0.45) 48%, rgba(0,0,0,0))"
      : "linear-gradient(to right, rgba(0,0,0,0.86), rgba(0,0,0,0.45) 48%, rgba(0,0,0,0))";
  const anchoredSide = side === "left" ? { right: 0 } : { left: 0 };
  const wingAnchor = side === "left" ? { left: 0 } : { right: 0 };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: wingWidthPx,
        overflow: "hidden",
        pointerEvents: "none",
        ...wingAnchor,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          width: geometry.previewWidthPx,
          borderRadius: 38,
          transform: `translateX(${previewTranslatePx}px) scale(${previewScale})`,
          transformOrigin: side === "left" ? "right top" : "left top",
          opacity: wingOpacity,
          filter: `blur(${wingBlurPx}px) saturate(0.84)`,
          WebkitMaskImage: wingMaskGradient,
          maskImage: wingMaskGradient,
          transition: `transform ${transitionMs}ms ease-out, opacity 240ms ease, filter 240ms ease`,
          ...anchoredSide,
        }}
      >
        <div inert aria-hidden="true" style={{ pointerEvents: "none" }}>
          {renderSurface(section, false)}
        </div>
      </div>
    </div>
  );
}

function WorkspacePreviewLane({
  side,
  section,
  geometry,
  isCompact,
  isDark,
  dragProgress,
  dragDeltaX,
  isDragging,
  idleDriftPx,
  isIdleSettling,
  onNavigate,
  renderSurface,
}: PreviewLaneProps) {
  if (!section) return null;

  const depth = getWorkspacePreviewDepth(isCompact);
  const draggingTowardThisSide =
    (dragDeltaX > 0 && side === "left") || (dragDeltaX < 0 && side === "right");
  const dragRevealBoostPx = isDragging ? 6 + dragProgress * 6 : 0;
  const sideRevealBoostPx = draggingTowardThisSide ? dragRevealBoostPx : dragRevealBoostPx * 0.6;
  const edgeRevealWidthPx = geometry.revealWidthPx + sideRevealBoostPx;
  const laneWidthPx = isCompact ? edgeRevealWidthPx + 2 : geometry.laneWidthPx + dragProgress * 6;
  const wingWidthPx = isCompact ? 0 : Math.max(0, laneWidthPx - edgeRevealWidthPx);
  const previewTranslatePx = idleDriftPx * (side === "left" ? 1 : -1) + dragDeltaX * 0.08;
  const blurReductionPx = isDragging ? 1 + dragProgress : 0;
  const previewBlurPx = Math.max(depth.blurPx - blurReductionPx, 0);
  const previewOpacity = Math.min(depth.opacity + (isDragging ? 0.06 * dragProgress : 0), isCompact ? 0.82 : 0.88);
  const previewScale = Math.min(depth.scale + (isDragging ? 0.01 * dragProgress : 0), 0.97);
  const transitionMs = isIdleSettling ? 520 : 220;
  const wingBlurPx = clamp(previewBlurPx + 8, 10, 18);
  const wingOpacity = clamp(previewOpacity * 0.5, 0.28, 0.42);
  const lanePositionStyle =
    side === "left"
      ? { right: `calc(50% + ${geometry.activeWidthPx / 2}px)` }
      : { left: `calc(50% + ${geometry.activeWidthPx / 2}px)` };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        width: laneWidthPx,
        height: "100%",
        zIndex: 1,
        pointerEvents: "none",
        overflow: "visible",
        ...lanePositionStyle,
      }}
    >
      {!isCompact && (
        <WorkspacePreviewWing
          side={side}
          section={section}
          geometry={geometry}
          wingWidthPx={wingWidthPx}
          previewTranslatePx={previewTranslatePx}
          previewScale={previewScale}
          wingBlurPx={wingBlurPx}
          wingOpacity={wingOpacity}
          transitionMs={transitionMs}
          renderSurface={renderSurface}
        />
      )}
      <WorkspacePreviewEdge
        side={side}
        section={section}
        geometry={geometry}
        isCompact={isCompact}
        isDark={isDark}
        edgeRevealWidthPx={edgeRevealWidthPx}
        previewTranslatePx={previewTranslatePx}
        previewScale={previewScale}
        previewBlurPx={previewBlurPx}
        previewOpacity={previewOpacity}
        transitionMs={transitionMs}
        onNavigate={onNavigate}
        renderSurface={renderSurface}
      />
    </div>
  );
}

export function WorkspacePage() {
  const navigate = useNavigate();
  const { section } = useParams();
  const { colorScheme } = useMantineColorScheme();
  const isCompact = !!useMediaQuery("(max-width: 36em)");
  const { width: viewportWidth } = useViewportSize();
  const { ref: stageMeasureRef, width: stageWidth } = useElementSize();
  const { ref: activeMeasureRef, width: measuredActiveWidth } = useElementSize();
  const prefersReducedMotion = !!useReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const previousIndexRef = useRef(1);
  const hasRunIdleDriftRef = useRef(false);
  const { dueCount } = useOutletContext<{ dueCount: number }>();
  const [slideDirection, setSlideDirection] = useState(0);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [idleDriftPx, setIdleDriftPx] = useState(0);
  const [isIdleSettling, setIsIdleSettling] = useState(false);

  const activePath = `/${section ?? "new"}` as WorkspaceNavItem["path"];
  const activeIndex = WORKSPACE_NAV_ITEMS.findIndex((item) => item.path === activePath);
  const stageAvailableWidthPx = stageWidth > 0 ? stageWidth : viewportWidth;
  const fallbackActiveWidthPx = isCompact
    ? Math.max(MIN_ACTIVE_WIDTH_PX, viewportWidth - MOBILE_ACTIVE_GUTTER_PX)
    : Math.max(
        MIN_ACTIVE_WIDTH_PX,
        Math.min(DESKTOP_ACTIVE_MAX_WIDTH_PX, stageAvailableWidthPx)
      );
  const activeWidthPx = measuredActiveWidth > 0 ? measuredActiveWidth : fallbackActiveWidthPx;
  const previewWidthPx = getWorkspacePreviewWidthPx(activeWidthPx, isCompact);
  const rawRevealWidthPx = getWorkspacePreviewRevealPx(previewWidthPx, isCompact);
  const revealWidthPx = isCompact
    ? Math.max(
        MOBILE_PEEK_MIN_PX,
        clamp(rawRevealWidthPx, MOBILE_PEEK_PREFERRED_MIN_PX, MOBILE_PEEK_PREFERRED_MAX_PX)
      )
    : clamp(rawRevealWidthPx, DESKTOP_EDGE_REVEAL_MIN_PX, DESKTOP_EDGE_REVEAL_MAX_PX);
  const desktopLaneWidthPx = Math.max((viewportWidth - activeWidthPx) / 2, revealWidthPx + 24);
  const stageGeometry: StageGeometry = {
    activeWidthPx,
    previewWidthPx,
    revealWidthPx,
    laneWidthPx: isCompact ? revealWidthPx + 2 : desktopLaneWidthPx,
  };
  const dragProgress = isDragging ? Math.min(Math.abs(dragDeltaX) / MAX_DRAG_DELTA_PX, 1) : 0;

  useEffect(() => {
    if (activeIndex < 0) return;
    const previousIndex = previousIndexRef.current;
    if (previousIndex !== activeIndex) {
      setSlideDirection(activeIndex > previousIndex ? 1 : -1);
      previousIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  useEffect(() => {
    // Skip idle drift animation on mobile for better performance
    if (activeIndex < 0 || prefersReducedMotion || hasRunIdleDriftRef.current || isCompact) return;
    hasRunIdleDriftRef.current = true;
    setIdleDriftPx(IDLE_DRIFT_PX);
    setIsIdleSettling(true);

    const settleFrame = window.requestAnimationFrame(() => {
      setIdleDriftPx(0);
    });
    const settleTimer = window.setTimeout(() => {
      setIsIdleSettling(false);
    }, 560);

    return () => {
      window.cancelAnimationFrame(settleFrame);
      window.clearTimeout(settleTimer);
    };
  }, [activeIndex, prefersReducedMotion, isCompact]);

  if (activeIndex < 0) {
    return <Navigate to="/new" replace />;
  }

  const activeSection = WORKSPACE_NAV_ITEMS[activeIndex] ?? WORKSPACE_NAV_ITEMS[1]!;
  const leftSection = activeIndex > 0 ? (WORKSPACE_NAV_ITEMS[activeIndex - 1] ?? null) : null;
  const rightSection =
    activeIndex < WORKSPACE_NAV_ITEMS.length - 1 ? (WORKSPACE_NAV_ITEMS[activeIndex + 1] ?? null) : null;
  const isDark = colorScheme === "dark";

  const renderSection = (path: WorkspaceNavItem["path"], isActive: boolean) => {
    if (path === "/new") {
      return <NewPage dueCount={dueCount} isActive={isActive} />;
    }
    return <StudySession mode={path === "/learn" ? "learn" : "review"} />;
  };

  const renderSurface = (routeSection: WorkspaceNavItem, isActive: boolean) => (
    <Paper
      radius={isCompact ? 34 : 42}
      style={{
        ...getWorkspaceSurfaceStyle(isDark),
        minHeight: isCompact ? "calc(100dvh - 176px)" : "min(78dvh, 58rem)",
      }}
    >
      <div
        style={{
          padding: isCompact ? "14px 14px 22px" : "26px 28px 32px",
          minHeight: "100%",
        }}
      >
        {renderSection(routeSection.path, isActive)}
      </div>
    </Paper>
  );

  return (
    <WorkspaceStage
      stageRef={stageMeasureRef}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        setIsDragging(true);
      }}
      onTouchMove={(event) => {
        const startX = touchStartX.current;
        const currentX = event.changedTouches[0]?.clientX ?? null;
        if (startX === null || currentX === null) return;
        setDragDeltaX(clamp(currentX - startX, -MAX_DRAG_DELTA_PX, MAX_DRAG_DELTA_PX));
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        const endX = event.changedTouches[0]?.clientX ?? null;
        touchStartX.current = null;
        if (startX !== null && endX !== null) {
          const deltaX = endX - startX;
          if (deltaX >= SWIPE_THRESHOLD && leftSection) navigate(leftSection.path);
          if (deltaX <= -SWIPE_THRESHOLD && rightSection) navigate(rightSection.path);
        }
        setDragDeltaX(0);
        setIsDragging(false);
      }}
      onTouchCancel={() => {
        touchStartX.current = null;
        setDragDeltaX(0);
        setIsDragging(false);
      }}
      isCompact={isCompact}
    >
      <WorkspacePreviewLane
        side="left"
        section={leftSection}
        geometry={stageGeometry}
        isCompact={isCompact}
        isDark={isDark}
        dragProgress={dragProgress}
        dragDeltaX={dragDeltaX}
        isDragging={isDragging}
        idleDriftPx={idleDriftPx}
        isIdleSettling={isIdleSettling}
        onNavigate={(path) => navigate(path)}
        renderSurface={renderSurface}
      />
      <WorkspacePreviewLane
        side="right"
        section={rightSection}
        geometry={stageGeometry}
        isCompact={isCompact}
        isDark={isDark}
        dragProgress={dragProgress}
        dragDeltaX={dragDeltaX}
        isDragging={isDragging}
        idleDriftPx={idleDriftPx}
        isIdleSettling={isIdleSettling}
        onNavigate={(path) => navigate(path)}
        renderSurface={renderSurface}
      />

      <WorkspaceActiveLane
        laneRef={activeMeasureRef}
        isCompact={isCompact}
        slideDirection={slideDirection}
        activePath={activeSection.path}
        prefersReducedMotion={prefersReducedMotion}
        dragDeltaX={dragDeltaX}
        isDragging={isDragging}
      >
        {renderSurface(activeSection, true)}
      </WorkspaceActiveLane>
    </WorkspaceStage>
  );
}
