import type { ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import {
  APP_MAX_WIDTH,
  getCanvasStyle,
  getGlassChromeStyle,
  getGlassPanelStyle,
  getSubtleSectionStyle,
} from "../../lib/ui/glass";

interface GuideScaffoldProps {
  mode?: "public" | "in-app";
  eyebrow: string;
  title: string;
  lead: string;
  accent?: string;
  heroQuote?: string;
  heroActions?: ReactNode;
  children: ReactNode;
}

interface GuideCalloutProps {
  emoji: string;
  title: string;
  children: ReactNode;
}

export function GuideScaffold({
  mode = "public",
  eyebrow,
  title,
  lead,
  accent = "brand",
  heroQuote,
  heroActions,
  children,
}: GuideScaffoldProps) {
  const { isAuthenticated, loading } = useAuth();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isCompact = !!useMediaQuery("(max-width: 48em)");
  const isDark = colorScheme === "dark";

  const content = (
    <Container size={APP_MAX_WIDTH} py={mode === "public" ? (isCompact ? 20 : 28) : 0}>
      <Stack gap={mode === "public" ? (isCompact ? "lg" : "xl") : "lg"}>
        {mode === "public" && (
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Button
              component={Link}
              to={isAuthenticated ? "/new" : "/login"}
              variant="subtle"
              color="gray"
              radius="xl"
              px={0}
              styles={{ root: { minHeight: "auto" } }}
            >
              sticky
            </Button>
            <Group gap="xs" wrap="wrap">
              {!loading && (
                <>
                  {isAuthenticated ? (
                    <>
                      <Button component={Link} to="/new" radius="xl" style={getGlassChromeStyle(isDark)}>
                        Open Sticky
                      </Button>
                      <Button component={Link} to="/how-to-use-sticky" variant="subtle" color="gray" radius="xl">
                        How to use Sticky
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button component={Link} to="/login" variant="subtle" color="gray" radius="xl">
                        Sign in
                      </Button>
                      <Button component={Link} to="/signup" radius="xl">
                        Create account
                      </Button>
                    </>
                  )}
                </>
              )}
              <ActionIcon
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                radius="xl"
                variant="default"
                style={getGlassChromeStyle(isDark)}
                onClick={() => toggleColorScheme()}
              >
                {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
              </ActionIcon>
            </Group>
          </Group>
        )}

        <Paper
          radius={mode === "public" ? 36 : 32}
          p={isCompact ? "lg" : "xl"}
          style={{
            ...getGlassPanelStyle(isDark, "hero"),
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -110,
              top: -90,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background:
                accent === "grape"
                  ? "radial-gradient(circle, rgba(153, 123, 220, 0.24), transparent 68%)"
                  : "radial-gradient(circle, rgba(148, 222, 67, 0.22), transparent 68%)",
              filter: "blur(4px)",
            }}
          />
          <Stack gap="md" style={{ position: "relative" }}>
            <Badge color={accent} variant="light" radius="xl" w="fit-content">
              {eyebrow}
            </Badge>
            <Stack gap={8} maw={760}>
              <Title order={1} size={isCompact ? "h2" : "h1"} style={{ lineHeight: 1.02 }}>
                {title}
              </Title>
              <Text size={isCompact ? "md" : "lg"} c="dimmed" maw={680}>
                {lead}
              </Text>
              {heroQuote && (
                <Text
                  size="sm"
                  fw={600}
                  c={accent}
                  style={{ letterSpacing: 0.2 }}
                >
                  {heroQuote}
                </Text>
              )}
            </Stack>
            {heroActions}
          </Stack>
        </Paper>

        <Paper
          component="article"
          radius={mode === "public" ? 32 : 28}
          p={isCompact ? "lg" : "xl"}
          style={getGlassPanelStyle(isDark)}
        >
          <Stack gap={isCompact ? "lg" : "xl"}>{children}</Stack>
        </Paper>
      </Stack>
    </Container>
  );

  if (mode === "in-app") {
    return content;
  }

  return (
    <Box style={getCanvasStyle(isDark)}>
      <Box py={isCompact ? 10 : 18}>{content}</Box>
    </Box>
  );
}

export function GuideCallout({ emoji, title, children }: GuideCalloutProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Paper p="md" radius="xl" style={getSubtleSectionStyle(isDark)}>
      <Group align="flex-start" wrap="nowrap" gap="sm">
        <Text size="xl" lh={1}>
          {emoji}
        </Text>
        <Stack gap={4}>
          <Text fw={700}>{title}</Text>
          <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
            {children}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
