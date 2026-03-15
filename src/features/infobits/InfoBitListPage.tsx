import {
  Title,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Loader,
  Center,
  Alert,
  Select,
  TextInput,
  Paper,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import { IconAlertCircle, IconSearch } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useInfoBits } from "./useInfoBits";
import { useCategories } from "../categories/useCategories";
import type { InfoBitStatus } from "../../types";
import {
  getGlassInsetStyle,
  getInputSurfaceStyle,
  getPrimaryActionStyle,
  getSubtleSectionStyle,
  wrapTextStyle,
} from "../../lib/ui/glass";

export function InfoBitListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<InfoBitStatus | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { categories } = useCategories();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const { infoBits, nextCursor, loading, error, loadMore } = useInfoBits({
    status: statusFilter ?? undefined,
    categoryId: categoryFilter ?? undefined,
  });

  const filtered = search
    ? infoBits.filter((ib) =>
        ib.title.toLowerCase().includes(search.toLowerCase())
      )
    : infoBits;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>My InfoBits</Title>
        <Button onClick={() => navigate("/new")} style={getPrimaryActionStyle(isDark)}>
          New InfoBit
        </Button>
      </Group>

      <Group align="stretch">
        <TextInput
          aria-label="Search InfoBits by title"
          placeholder="Search by title..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
          radius="xl"
          styles={{ input: getInputSurfaceStyle(isDark) }}
        />
        <Select
          aria-label="Filter InfoBits by status"
          placeholder="Status"
          data={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
            { value: "mastered", label: "Mastered" },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as InfoBitStatus | null)}
          clearable
          w={140}
          radius="xl"
          styles={{ input: getInputSurfaceStyle(isDark) }}
        />
        <Select
          aria-label="Filter InfoBits by category"
          placeholder="Category"
          data={categories.map((c) => ({
            value: c.categoryId,
            label: c.name,
          }))}
          value={categoryFilter}
          onChange={setCategoryFilter}
          clearable
          w={180}
          radius="xl"
          styles={{ input: getInputSurfaceStyle(isDark) }}
        />
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle />} color="red" role="alert">
          {error.message}
        </Alert>
      )}

      {loading && infoBits.length === 0 ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : filtered.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Text c="dimmed">No InfoBits found</Text>
            <Button variant="light" onClick={() => navigate("/new")}>
              Create your first one
            </Button>
          </Stack>
        </Center>
      ) : (
        <>
          <Stack gap="sm">
            {filtered.map((ib) => (
              <Paper
                key={ib.infoBitId}
                p="md"
                radius="xl"
                withBorder
                style={getSubtleSectionStyle(isDark)}
              >
                <UnstyledButton
                  aria-label={`Open ${ib.title}`}
                  onClick={() => navigate(`/infobits/${ib.infoBitId}`)}
                  style={{ display: "block", width: "100%", textAlign: "left" }}
                >
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} style={wrapTextStyle}>
                        {ib.title}
                      </Text>
                      <Group gap="xs">
                        <Badge size="sm" variant="light">
                          {ib.category.name}
                        </Badge>
                        {ib.tags.map((tag) => (
                          <Badge key={tag} size="sm" variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                    <Stack align="flex-end" gap={4} style={{ flexShrink: 0 }}>
                      <Text size="xs" c="dimmed">
                        {ib.cards.length} card{ib.cards.length !== 1 ? "s" : ""}
                      </Text>
                      {ib.dueAt && (
                        <Text size="xs" c={new Date(ib.dueAt) <= new Date() ? "red" : "dimmed"}>
                          {new Date(ib.dueAt) <= new Date()
                            ? "Due now"
                            : `Due ${new Date(ib.dueAt).toLocaleDateString()}`}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </UnstyledButton>
              </Paper>
            ))}
          </Stack>

          {nextCursor && (
            <Center>
              <Button
                variant="light"
                onClick={loadMore}
                loading={loading}
                style={getGlassInsetStyle(isDark)}
              >
                Load more
              </Button>
            </Center>
          )}
        </>
      )}
    </Stack>
  );
}
