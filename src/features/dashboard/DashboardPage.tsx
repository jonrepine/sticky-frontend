import {
  Title,
  Text,
  Card,
  Group,
  Badge,
  SimpleGrid,
  Stack,
  Button,
  Loader,
  Center,
  Alert,
  Paper,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCards,
  IconFlag,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "./useDashboard";
import { useDueInfoBits } from "../review/useDueInfoBits";

export function DashboardPage() {
  const navigate = useNavigate();
  const { dashboard, loading, error } = useDashboard();
  const { dueInfoBits, loading: dueLoading } = useDueInfoBits();

  if (loading || dueLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle />} color="red" role="alert">
        {error.message}
      </Alert>
    );
  }

  const dueCount = dueInfoBits.length;

  return (
    <Stack gap="lg">
      <Title order={2}>Dashboard</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={500}>Due for Review</Text>
            <ThemeIcon variant="light" color="violet" size="lg">
              <IconCards size={20} />
            </ThemeIcon>
          </Group>
          <Text size="2rem" fw={700} c="violet">
            {dueCount}
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {dueCount === 0
              ? "All caught up!"
              : `${dueCount} item${dueCount !== 1 ? "s" : ""} waiting`}
          </Text>
          {dueCount > 0 && (
            <Button
              variant="light"
              color="violet"
              fullWidth
              onClick={() => navigate("/review")}
            >
              Start Review
            </Button>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={500}>Open Flags</Text>
            <ThemeIcon variant="light" color="orange" size="lg">
              <IconFlag size={20} />
            </ThemeIcon>
          </Group>
          <Text size="2rem" fw={700} c="orange">
            {(dashboard?.flaggedInfoBits.length ?? 0) +
              (dashboard?.flaggedCards.length ?? 0)}
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Items needing attention
          </Text>
          <Button
            variant="light"
            color="orange"
            fullWidth
            onClick={() => navigate("/flags")}
          >
            View Flags
          </Button>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={500}>Topics</Text>
          </Group>
          <Text size="2rem" fw={700}>
            {dashboard?.sectionsByTag.length ?? 0}
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Tag categories
          </Text>
          <Button
            variant="light"
            fullWidth
            onClick={() => navigate("/tags")}
          >
            Browse Tags
          </Button>
        </Card>
      </SimpleGrid>

      {dashboard?.sectionsByTag && dashboard.sectionsByTag.length > 0 && (
        <>
          <Title order={3} mt="md">
            By Topic
          </Title>
          {dashboard.sectionsByTag.map((section) => (
            <Paper key={section.tag.tagId} withBorder p="md" radius="md">
              <Group justify="space-between" mb="sm">
                <Badge size="lg" variant="light">
                  {section.tag.name}
                </Badge>
                <Text size="sm" c="dimmed">
                  {section.infoBits.length} item
                  {section.infoBits.length !== 1 ? "s" : ""}
                </Text>
              </Group>
              <Stack gap="xs">
                {section.infoBits.slice(0, 5).map((ib) => (
                  <UnstyledButton
                    key={ib.infoBitId}
                    aria-label={`Open ${ib.title}`}
                    onClick={() => navigate(`/infobits/${ib.infoBitId}`)}
                    style={{ display: "block", width: "100%", textAlign: "left" }}
                  >
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Text
                        size="sm"
                        style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}
                      >
                        {ib.title}
                      </Text>
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {ib.cards.length} card{ib.cards.length !== 1 ? "s" : ""}
                      </Text>
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </Paper>
          ))}
        </>
      )}
    </Stack>
  );
}
