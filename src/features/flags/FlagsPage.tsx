import {
  Title,
  Stack,
  Text,
  Group,
  Loader,
  Center,
  Alert,
  Badge,
  Button,
  Paper,
  Select,
  useMantineColorScheme,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { useFlags } from "./useFlags";
import type { FlagStatus } from "../../types";
import { getGlassInsetStyle, getInputSurfaceStyle, getSubtleSectionStyle } from "../../lib/ui/glass";

const FLAG_TYPE_COLORS: Record<string, string> = {
  NEEDS_EDIT: "orange",
  NEEDS_REGENERATE: "yellow",
  NEEDS_MEDIA: "blue",
  LOW_QUALITY: "red",
  OTHER: "gray",
};

export function FlagsPage() {
  const [statusFilter, setStatusFilter] = useState<FlagStatus>("OPEN");
  const { flags, loading, error, resolveFlag, resolving } = useFlags({
    status: statusFilter,
  });
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle />} color="red">
        {error.message}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Flags</Title>
        <Select
          data={[
            { value: "OPEN", label: "Open" },
            { value: "RESOLVED", label: "Resolved" },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter((v as FlagStatus) ?? "OPEN")}
          w={140}
          radius="xl"
          styles={{ input: getInputSurfaceStyle(isDark) }}
        />
      </Group>

      {flags.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No {statusFilter.toLowerCase()} flags</Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {flags.map((flag) => (
            <Paper
              key={flag.flagId}
              p="md"
              radius="xl"
              withBorder
              style={getSubtleSectionStyle(isDark)}
            >
              <Group justify="space-between">
                <div>
                  <Group gap="xs" mb={4}>
                    <Badge
                      color={FLAG_TYPE_COLORS[flag.flagType] ?? "gray"}
                      variant="light"
                    >
                      {flag.flagType.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {flag.entityType}
                    </Badge>
                  </Group>
                  {flag.note && (
                    <Text size="sm" mt={4}>
                      {flag.note}
                    </Text>
                  )}
                  <Text size="xs" c="dimmed" mt={4}>
                    Created {new Date(flag.createdAt).toLocaleString()}
                  </Text>
                </div>
                {flag.status === "OPEN" && (
                  <Button
                    variant="light"
                    color="green"
                    size="sm"
                    leftSection={<IconCheck size={14} />}
                    onClick={() => resolveFlag(flag.flagId)}
                    loading={resolving}
                    style={getGlassInsetStyle(isDark)}
                  >
                    Resolve
                  </Button>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
