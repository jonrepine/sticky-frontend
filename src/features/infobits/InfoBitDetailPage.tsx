import { useState } from "react";
import {
  Title,
  Text,
  Badge,
  Stack,
  Group,
  Paper,
  Button,
  TextInput,
  Textarea,
  ActionIcon,
  Alert,
  Loader,
  Center,
  Menu,
  Modal,
  Divider,
} from "@mantine/core";
import {
  IconEdit,
  IconArchive,
  IconTrash,
  IconTrophy,
  IconAlertCircle,
  IconDots,
  IconPlus,
  IconFlag,
} from "@tabler/icons-react";
import { useParams, useNavigate } from "react-router-dom";
import { useInfoBit } from "./useInfoBit";
import { useInfoBitActions } from "./useInfoBitActions";
import { useCardActions } from "../cards/useCardActions";
import { useFlags } from "../flags/useFlags";
import { BlockContent } from "../../components/BlockContent";

export function InfoBitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { infoBit, loading, error, refetch } = useInfoBit(id ?? "");
  const { archiveInfoBit, deleteInfoBit, markMastered, updateInfoBit } =
    useInfoBitActions();
  const { addCard, archiveCard, loading: cardLoading } = useCardActions(
    id ?? ""
  );
  const { createFlag } = useFlags();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagNote, setFlagNote] = useState("");

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error || !infoBit) {
    return (
      <Alert icon={<IconAlertCircle />} color="red" role="alert">
        {error?.message ?? "InfoBit not found"}
      </Alert>
    );
  }

  const handleSaveTitle = async () => {
    await updateInfoBit({ infoBitId: infoBit.infoBitId, title: editTitle });
    setEditing(false);
    refetch();
  };

  const handleAddCard = async () => {
    await addCard({
      frontBlocks: [{ type: "text", text: newFront.trim() }],
      backBlocks: [{ type: "text", text: newBack.trim() }],
    });
    setNewFront("");
    setNewBack("");
    setAddingCard(false);
    refetch();
  };

  const handleFlag = async (flagType: string) => {
    await createFlag({
      entityType: "INFOBIT",
      entityId: infoBit.infoBitId,
      flagType: flagType as "NEEDS_EDIT" | "LOW_QUALITY" | "OTHER",
      note: flagNote || undefined,
    });
    setFlagModalOpen(false);
    setFlagNote("");
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        {editing ? (
          <Group style={{ flex: 1 }}>
            <TextInput
              value={editTitle}
              onChange={(e) => setEditTitle(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button size="sm" onClick={handleSaveTitle}>
              Save
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </Group>
        ) : (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Title order={2} style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {infoBit.title}
              </Title>
              <Group gap="xs" mt={4}>
                <Badge variant="light">{infoBit.category.name}</Badge>
                <Badge variant="outline" color="gray">
                  {infoBit.status}
                </Badge>
                {infoBit.tags.map((tag) => (
                  <Badge key={tag} variant="outline" size="sm">
                    {tag}
                  </Badge>
                ))}
              </Group>
            </div>
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon aria-label="Open InfoBit actions" variant="subtle">
                  <IconDots size={20} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    setEditTitle(infoBit.title);
                    setEditing(true);
                  }}
                >
                  Edit Title
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFlag size={16} />}
                  onClick={() => setFlagModalOpen(true)}
                >
                  Flag
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrophy size={16} />}
                  color="green"
                  onClick={async () => {
                    await markMastered(infoBit.infoBitId);
                    navigate("/infobits");
                  }}
                >
                  Mark Mastered
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconArchive size={16} />}
                  color="yellow"
                  onClick={async () => {
                    await archiveInfoBit(infoBit.infoBitId);
                    navigate("/infobits");
                  }}
                >
                  Archive
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={async () => {
                    await deleteInfoBit(infoBit.infoBitId);
                    navigate("/infobits");
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </>
        )}
      </Group>

      {infoBit.dueAt && (
        <Text size="sm" c="dimmed">
          {new Date(infoBit.dueAt) <= new Date()
            ? "Due for review now"
            : `Next review: ${new Date(infoBit.dueAt).toLocaleString()}`}
        </Text>
      )}

      <Group justify="space-between">
        <Title order={3}>
          Cards ({infoBit.cards.filter((c) => c.status === "active").length})
        </Title>
        <Button
          variant="light"
          size="sm"
          leftSection={<IconPlus size={16} />}
          onClick={() => setAddingCard(true)}
        >
          Add Card
        </Button>
      </Group>

      {addingCard && (
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Textarea
              label="Front"
              placeholder="Question or prompt"
              value={newFront}
              onChange={(e) => setNewFront(e.currentTarget.value)}
              minRows={2}
            />
            <Textarea
              label="Back"
              placeholder="Answer"
              value={newBack}
              onChange={(e) => setNewBack(e.currentTarget.value)}
              minRows={2}
            />
            <Group justify="flex-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => setAddingCard(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddCard}
                loading={cardLoading}
                disabled={!newFront.trim() || !newBack.trim()}
              >
                Add
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {infoBit.cards
        .filter((c) => c.status === "active")
        .map((card, idx) => (
          <Paper key={card.cardId} withBorder p="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">
                Card {idx + 1}
              </Text>
              <ActionIcon
                aria-label={`Archive card ${idx + 1}`}
                variant="subtle"
                color="red"
                size="sm"
                onClick={async () => {
                  await archiveCard(card.cardId);
                  refetch();
                }}
              >
                <IconArchive size={14} />
              </ActionIcon>
            </Group>
            <Divider mb="sm" />
            <Stack gap="xs">
              <div>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Front
                </Text>
                <BlockContent blocks={card.frontBlocks} />
              </div>
              <div>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Back
                </Text>
                <BlockContent blocks={card.backBlocks} />
              </div>
            </Stack>
          </Paper>
        ))}

      <Modal
        opened={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Flag this InfoBit"
      >
        <Stack>
          <Textarea
            label="Note (optional)"
            value={flagNote}
            onChange={(e) => setFlagNote(e.currentTarget.value)}
          />
          <Group>
            <Button
              variant="light"
              color="orange"
              onClick={() => handleFlag("NEEDS_EDIT")}
            >
              Needs Edit
            </Button>
            <Button
              variant="light"
              color="red"
              onClick={() => handleFlag("LOW_QUALITY")}
            >
              Low Quality
            </Button>
            <Button variant="light" onClick={() => handleFlag("OTHER")}>
              Other
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
