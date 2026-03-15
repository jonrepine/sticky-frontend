import { useState } from "react";
import {
  Title,
  TextInput,
  Select,
  TagsInput,
  Textarea,
  Button,
  Paper,
  Stack,
  Group,
  ActionIcon,
  Text,
  Alert,
  Divider,
} from "@mantine/core";
import { IconPlus, IconTrash, IconAlertCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../categories/useCategories";
import { useCreateInfoBit } from "./useCreateInfoBit";

interface CardDraft {
  front: string;
  back: string;
}

export function CreateInfoBitPage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { createInfoBit, loading, error } = useCreateInfoBit();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [originalContent, setOriginalContent] = useState("");
  const [cards, setCards] = useState<CardDraft[]>([{ front: "", back: "" }]);

  const addCard = () => setCards((c) => [...c, { front: "", back: "" }]);

  const removeCard = (idx: number) =>
    setCards((c) => c.filter((_, i) => i !== idx));

  const updateCard = (idx: number, field: "front" | "back", value: string) =>
    setCards((c) => c.map((card, i) => (i === idx ? { ...card, [field]: value } : card)));

  const canSubmit =
    title.trim() &&
    categoryId &&
    cards.length > 0 &&
    cards.every((c) => c.front.trim() && c.back.trim());

  const handleSubmit = async () => {
    if (!canSubmit || !categoryId) return;
    const result = await createInfoBit({
      title: title.trim(),
      categoryId,
      tags: tags.length > 0 ? tags : undefined,
      originalContent: originalContent.trim() || undefined,
      cards: cards.map((c) => ({
        frontBlocks: [{ type: "text", text: c.front.trim() }],
        backBlocks: [{ type: "text", text: c.back.trim() }],
      })),
    });
    if (result) navigate(`/infobits/${result.infoBitId}`);
  };

  const categoryOptions = categories.map((c) => ({
    value: c.categoryId,
    label: c.name,
  }));

  return (
    <Stack gap="lg">
      <Title order={2}>Create InfoBit</Title>

      {error && (
        <Alert icon={<IconAlertCircle />} color="red" variant="light" role="alert">
          {error.message}
        </Alert>
      )}

      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <TextInput
            label="Title"
            description="The concept, word, or fact you want to remember"
            placeholder="e.g. Serendipity"
            required
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />

          <Select
            label="Category"
            placeholder="Pick a category"
            required
            data={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
          />

          <TagsInput
            label="Tags"
            placeholder="Type a tag and press Enter"
            value={tags}
            onChange={setTags}
          />

          <Textarea
            label="Original Content"
            description="Optional — paste or type the raw knowledge (useful for regeneration later)"
            placeholder="e.g. Serendipity means finding valuable things by chance"
            value={originalContent}
            onChange={(e) => setOriginalContent(e.currentTarget.value)}
            minRows={2}
          />
        </Stack>
      </Paper>

      <Group justify="space-between">
        <Title order={3}>Cards</Title>
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={addCard}
          size="sm"
        >
          Add Card
        </Button>
      </Group>

      {cards.map((card, idx) => (
        <Paper key={idx} withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={500} size="sm">
              Card {idx + 1}
            </Text>
            {cards.length > 1 && (
              <ActionIcon
                aria-label={`Remove card ${idx + 1}`}
                variant="subtle"
                color="red"
                onClick={() => removeCard(idx)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            )}
          </Group>
          <Divider mb="sm" />
          <Stack gap="sm">
            <Textarea
              label="Front (question/prompt)"
              placeholder="e.g. Define serendipity"
              required
              value={card.front}
              onChange={(e) =>
                updateCard(idx, "front", e.currentTarget.value)
              }
              minRows={2}
            />
            <Textarea
              label="Back (answer)"
              placeholder="e.g. Finding valuable things by chance"
              required
              value={card.back}
              onChange={(e) =>
                updateCard(idx, "back", e.currentTarget.value)
              }
              minRows={2}
            />
          </Stack>
        </Paper>
      ))}

      <Group justify="flex-end">
        <Button variant="default" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
        >
          Create InfoBit
        </Button>
      </Group>
    </Stack>
  );
}
