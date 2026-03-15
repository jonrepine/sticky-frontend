import { useState } from "react";
import {
  ActionIcon,
  AppShell as MantineAppShell,
  Button,
  Drawer,
  Group,
  Stack,
  Text,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBrain,
  IconFlask,
  IconHelpCircle,
  IconLogout,
  IconMenu2,
  IconMoon,
  IconSettings,
  IconStack2,
  IconSun,
} from "@tabler/icons-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSignOut } from "../features/auth/useSignOut";
import { useDueInfoBits } from "../features/review/useDueInfoBits";
import {
  APP_MAX_WIDTH,
  getCanvasStyle,
  getDockClearance,
  getGlassChromeStyle,
} from "../lib/ui/glass";
import { FloatingDock } from "./FloatingDock";
export function AppShell() {
  const [menuOpened, setMenuOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useSignOut();
  const allDueState = useDueInfoBits("ALL");
  const learnDueState = useDueInfoBits("LEARN");
  const reviewDueState = useDueInfoBits("REVIEW");
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isCompact = !!useMediaQuery("(max-width: 36em)");
  const isDark = colorScheme === "dark";
  const allDueInfoBits = allDueState.dueInfoBits;
  const learnDueInfoBits = learnDueState.dueInfoBits;
  const reviewDueInfoBits = reviewDueState.dueInfoBits;
  const dueCount = allDueInfoBits.length;
  const learnDueCount = learnDueInfoBits.length;
  const reviewDueCount = reviewDueInfoBits.length;
  const isWorkspaceRoute = location.pathname === "/new" || location.pathname === "/learn" || location.pathname === "/review";

  return (
    <MantineAppShell
      header={{ height: 60 }}
      padding={0}
      style={getCanvasStyle(isDark)}
    >
      <MantineAppShell.Header
        withBorder={false}
        style={{ background: "transparent" }}
      >
        <div
          style={{
            maxWidth: APP_MAX_WIDTH,
            width: "100%",
            height: "100%",
            margin: "0 auto",
            padding: isCompact ? "0 12px" : "0 18px",
            boxSizing: "border-box",
          }}
        >
          <Group h="100%" justify="space-between">
            <Group gap={isCompact ? 8 : 12}>
              <UnstyledButton
                aria-label="Go to new fact capture"
                onClick={() => navigate("/new")}
                style={{ padding: "6px 4px", borderRadius: 10 }}
              >
                <Text size="sm" fw={700} c={isDark ? "gray.3" : "dark.8"} style={{ letterSpacing: 0.4 }}>
                  sticky
                </Text>
              </UnstyledButton>

              <Button
                aria-label="Open guide"
                variant="subtle"
                size="xs"
                radius="lg"
                color="gray"
                leftSection={<IconHelpCircle size={14} />}
                onClick={() => {
                  navigate("/how-to-use-sticky");
                }}
                styles={{
                  root: {
                    fontWeight: 500,
                    height: 28,
                    paddingInline: isCompact ? 8 : 10,
                  },
                }}
              >
                Guide
              </Button>
            </Group>

            <Group gap={6}>
              <ActionIcon
                aria-label={colorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                variant="default"
                radius="xl"
                style={getGlassChromeStyle(isDark)}
                onClick={() => toggleColorScheme()}
              >
                {colorScheme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
              </ActionIcon>
              <ActionIcon
                aria-label="Open app menu"
                variant="default"
                radius="xl"
                style={getGlassChromeStyle(isDark)}
                onClick={() => setMenuOpened(true)}
              >
                <IconMenu2 size={17} />
              </ActionIcon>
            </Group>
          </Group>
        </div>
      </MantineAppShell.Header>

      <MantineAppShell.Main
        style={{
          maxWidth: isWorkspaceRoute ? "100%" : APP_MAX_WIDTH,
          width: "100%",
          boxSizing: "border-box",
          margin: "0 auto",
          overflow: "visible",
          paddingTop: `calc(var(--app-shell-header-offset, 60px) + ${isCompact ? "10px" : "18px"})`,
          paddingRight: isWorkspaceRoute ? 0 : isCompact ? "8px" : "16px",
          paddingBottom: getDockClearance(isCompact),
          paddingLeft: isWorkspaceRoute ? 0 : isCompact ? "8px" : "16px",
        }}
      >
        <Outlet
          context={{
            dueCount,
            dueQueues: {
              ALL: allDueState,
              LEARN: learnDueState,
              REVIEW: reviewDueState,
            },
          }}
        />
      </MantineAppShell.Main>
      <FloatingDock
        dueCount={dueCount}
        learnDueCount={learnDueCount}
        reviewDueCount={reviewDueCount}
      />

      <Drawer
        opened={menuOpened}
        onClose={() => setMenuOpened(false)}
        title="Menu"
        position="right"
        size="xs"
        overlayProps={{ blur: 18, backgroundOpacity: isDark ? 0.28 : 0.2 }}
        styles={{
          content: {
            ...getGlassChromeStyle(isDark),
            background: isDark ? "rgba(17, 24, 32, 0.82)" : "rgba(250, 252, 255, 0.86)",
          },
          header: {
            background: "transparent",
          },
          body: {
            background: "transparent",
          },
        }}
      >
        <Stack>
          <Button
            variant="light"
            justify="space-between"
            leftSection={<IconHelpCircle size={16} />}
            onClick={() => {
              setMenuOpened(false);
              navigate("/how-to-use-sticky");
            }}
          >
            How to use Sticky
          </Button>
          <Button
            variant="light"
            justify="space-between"
            leftSection={<IconBrain size={16} />}
            onClick={() => {
              setMenuOpened(false);
              navigate("/how-to-remember");
            }}
          >
            How to remember
          </Button>
          <Button
            variant="light"
            justify="space-between"
            leftSection={<IconStack2 size={16} />}
            onClick={() => {
              setMenuOpened(false);
              navigate("/my-cards");
            }}
          >
            My Cards
          </Button>
          <Button
            variant="light"
            justify="space-between"
            leftSection={<IconSettings size={16} />}
            onClick={() => {
              setMenuOpened(false);
              navigate("/settings");
            }}
          >
            Settings
          </Button>
          <Button
            variant="light"
            justify="space-between"
            leftSection={<IconFlask size={16} />}
            onClick={() => {
              setMenuOpened(false);
              navigate("/playground");
            }}
          >
            FSRS Playground
          </Button>
          <Button
            color="red"
            variant="light"
            justify="space-between"
            leftSection={<IconLogout size={16} />}
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </Stack>
      </Drawer>
    </MantineAppShell>
  );
}
