import {
  Title,
  Stack,
  Card,
  Text,
  Group,
  Loader,
  Center,
  Alert,
  ActionIcon,
  Badge,
  Menu,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconDots,
  IconArchive,
  IconTrash,
} from "@tabler/icons-react";
import { useTags } from "./useTags";

export function TagsPage() {
  const { tags, loading, error, archiveTag, deleteTag } = useTags();

  if (loading) {
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

  return (
    <Stack gap="lg">
      <Title order={2}>Tags</Title>

      {tags.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">
            No tags yet. Tags are created when you add them to InfoBits.
          </Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {tags.map((tag) => (
            <Card
              key={tag.tagId}
              shadow="sm"
              padding="md"
              radius="md"
              withBorder
            >
              <Group justify="space-between">
                <Group>
                  <Badge variant="light" size="lg">
                    {tag.name}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {tag.slug}
                  </Text>
                </Group>
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon aria-label={`Open actions for tag ${tag.name}`} variant="subtle">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconArchive size={14} />}
                      onClick={() => archiveTag(tag.tagId)}
                    >
                      Archive
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => deleteTag(tag.tagId)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
