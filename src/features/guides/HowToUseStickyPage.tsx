import { Alert, Badge, Button, Group, List, Paper, SimpleGrid, Stack, Text, Title, useMantineColorScheme } from "@mantine/core";
import { IconArrowRight, IconBulb, IconCheck, IconSparkles } from "@tabler/icons-react";
import { Link, useSearchParams } from "react-router-dom";
import { GuideCallout, GuideScaffold } from "./GuideScaffold";
import { CATEGORY_COLORS, CATEGORY_DOCTRINE } from "../../lib/llm/categoryDoctrine";
import { getSubtleSectionStyle } from "../../lib/ui/glass";

const CATEGORY_HELP: Record<string, { emoji: string; when: string; example: string }> = {
  "new-word": {
    emoji: "📚",
    when: "Use when you want a word to become usable, not just familiar.",
    example: "ephemeral, tacit, parsimonious",
  },
  "new-word-plus": {
    emoji: "🧷",
    when: "Use when the source or story around the word helps it stick.",
    example: "a phrase from a novel, sermon, lecture, or podcast",
  },
  fact: {
    emoji: "🌍",
    when: "Use for one proposition, relationship, date, identity, or clean factual claim.",
    example: "Canberra is the capital of Australia",
  },
  "technical-definition": {
    emoji: "🧪",
    when: "Use when precision, domain, and contrast matter.",
    example: "idempotent, oncotic pressure, apical impulse",
  },
  joke: {
    emoji: "🎭",
    when: "Use when wording or delivery matters more than concept alone.",
    example: "a joke you want to retell well",
  },
  "virtue-life-lesson": {
    emoji: "🧭",
    when: "Use for principles, habits, or lessons you want to apply in real life.",
    example: "do the hard thing first",
  },
  "quote-proverb-verse": {
    emoji: "🗣️",
    when: "Use when exact wording matters and you want recitation-level recall.",
    example: "a proverb, verse, quote, or line",
  },
  "contrast-pair": {
    emoji: "⚖️",
    when: "Use when two nearby concepts are easy to confuse.",
    example: "afferent vs efferent, sensitivity vs specificity",
  },
  "formula-rule": {
    emoji: "📐",
    when: "Use for equations, laws, rules, or compact structured expressions.",
    example: "Ohm's law, Bayes' rule, Starling forces",
  },
  "procedure-workflow": {
    emoji: "🪜",
    when: "Use for one short sequence that can honestly be remembered as a unit.",
    example: "initial steps of donning sterile gloves",
  },
};

const SOCRATIC_GOOD_FITS = [
  "The input is still blurry and needs narrowing.",
  "The source, context, contrast, or significance actually changes the best card shape.",
  "The same word or term could mean different things in different domains.",
  "You want the model to ask for the missing detail instead of guessing.",
];

const SOCRATIC_BAD_FITS = [
  "You already have one very atomic fact.",
  "You are saving an exact quote, joke, or other wording-heavy input.",
  "You want to type the cards manually and move on.",
  "The clarifying round would add ceremony, not signal.",
];

export function HowToUseStickyPage() {
  const [searchParams] = useSearchParams();
  const fromSignup = searchParams.get("from") === "signup";
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <GuideScaffold
      mode="in-app"
      eyebrow="✨ Start here"
      title="How to use Sticky without overthinking it"
      lead="Sticky works best when you give it one honest unit, choose the category that matches the memory task, and let Socratic help only when the shape still needs sharpening."
      accent="grape"
      heroQuote="Capture fast. Review honestly. Let the structure do the remembering work."
      heroActions={
        <Group gap="sm" wrap="wrap">
          <Button component={Link} to="/new" radius="xl" rightSection={<IconArrowRight size={16} />}>
            Start capturing
          </Button>
          <Button component={Link} to="/how-to-remember" variant="subtle" color="gray" radius="xl">
            Read the memory guide
          </Button>
        </Group>
      }
    >
      {fromSignup && (
        <Alert
          icon={<IconSparkles size={16} />}
          color="brand"
          variant="light"
          radius="xl"
          title="Account ready"
        >
          Before you start throwing facts in, get the model once. This page is the quick calibration.
        </Alert>
      )}

      <Stack gap="sm">
        <Badge color="brand" variant="light" radius="xl" w="fit-content">
          The 20-second loop
        </Badge>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <GuideCallout emoji="1️⃣" title="Capture one thing">
            One term, one fact, one quote, one rule, one short procedure. If it feels like a chapter, it is too big.
          </GuideCallout>
          <GuideCallout emoji="2️⃣" title="Choose the memory shape">
            Pick the category that matches what you are trying to remember, not just the topic area.
          </GuideCallout>
          <GuideCallout emoji="3️⃣" title="Use Socratic when it adds signal">
            Leave it on when context, contrast, or exact interpretation matters. Turn it off when the input is already precise.
          </GuideCallout>
          <GuideCallout emoji="4️⃣" title="Keep the cards that feel honest">
            Edit or deselect weak cards, submit the good ones, and let review happen later when they are due.
          </GuideCallout>
        </SimpleGrid>
      </Stack>

      <Paper p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Stack gap="sm">
          <Badge color="grape" variant="light" radius="xl" w="fit-content">
            The single most important rule
          </Badge>
          <Title order={2}>Start with one honest memory unit.</Title>
          <Text c="dimmed" style={{ lineHeight: 1.75 }}>
            Sticky is not meant to turn blurry projects into magical flashcards. “Remember the Bible” is not a card.
            “Understand all networking” is not a card. “Ephemeral means short-lived” is a card candidate. So is
            “The four heads of the quadriceps are…” if the list itself is the fact.
          </Text>
        </Stack>
      </Paper>

      <Stack gap="sm">
        <Title order={2}>🟣 What Socratic actually does</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          Socratic is not there to make the app feel clever. It is there to ask for the missing detail that changes card quality.
          In practice, Sticky can use it to tighten context, structure, or disambiguation before generation.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Paper p="md" radius="xl" style={getSubtleSectionStyle(isDark)}>
          <Stack gap="xs">
            <Badge color="grape" variant="light" radius="xl" w="fit-content">
              Leave Socratic on when...
            </Badge>
            <List spacing="sm" icon={<IconCheck size={16} />}>
              {SOCRATIC_GOOD_FITS.map((item) => (
                <List.Item key={item}>
                  {item === "You want the model to ask for the missing detail instead of guessing." ? (
                    <Group gap="xs" wrap="wrap">
                      <Badge color="grape" variant="light" radius="xl">
                        Key use-case
                      </Badge>
                      <Text size="sm" fw={700} c="grape.4">
                        {item}
                      </Text>
                    </Group>
                  ) : (
                    <Text size="sm">{item}</Text>
                  )}
                </List.Item>
              ))}
            </List>
          </Stack>
        </Paper>
        <Paper p="md" radius="xl" style={getSubtleSectionStyle(isDark)}>
          <Stack gap="xs">
            <Badge color="gray" variant="light" radius="xl" w="fit-content">
              Turn it off when...
            </Badge>
            <List spacing="sm" icon={<IconBulb size={16} />}>
              {SOCRATIC_BAD_FITS.map((item) => (
                <List.Item key={item}>
                  <Text size="sm">{item}</Text>
                </List.Item>
              ))}
            </List>
          </Stack>
        </Paper>
      </SimpleGrid>

      <Stack gap="sm">
        <Title order={2}>🌈 Categories are not topics. They are memory strategies.</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          This is the key Sticky idea. Pick the category by the shape of the thing you want to remember. That tells the
          model what kinds of cards to generate and what kinds of prompts are worth asking.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {Object.values(CATEGORY_DOCTRINE).map((category) => {
          const help = CATEGORY_HELP[category.slug];
          return (
            <Paper key={category.slug} p="md" radius="xl" style={getSubtleSectionStyle(isDark)}>
              <Stack gap={8}>
                <Group justify="space-between" align="center" wrap="wrap">
                  <Group gap="xs">
                    <Text size="xl" lh={1}>
                      {help?.emoji ?? "📝"}
                    </Text>
                    <Text fw={700}>{category.label}</Text>
                  </Group>
                  <Badge color={CATEGORY_COLORS[category.slug] || "gray"} variant="light" radius="xl">
                    {category.targetCardCount} card{category.targetCardCount === 1 ? "" : "s"}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.65 }}>
                  {help?.when}
                </Text>
                <Text size="xs" c="dimmed">
                  Example: {help?.example}
                </Text>
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Stack gap="sm">
        <Title order={2}>🏷️ Tags and defaults</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          Use tags lightly for session context: a chapter, lecture, exam block, or topic cluster. Sticky keeps the current
          category ready while you are in the same capture flow, and your longer-term defaults live in Settings. That means
          you do not need to rebuild the setup every single time.
        </Text>
      </Stack>

      <Paper p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Stack gap="sm">
          <Badge color="brand" variant="light" radius="xl" w="fit-content">
            After cards appear
          </Badge>
          <Title order={3}>Do a fast honesty check.</Title>
          <List spacing="sm" icon={<IconCheck size={16} />}>
            <List.Item>Keep cards that test one thing clearly.</List.Item>
            <List.Item>Edit wording if the answer feels fuzzy or unfair.</List.Item>
            <List.Item>Deselect cards that drift off the main memory target.</List.Item>
            <List.Item>Submit the good set and move on.</List.Item>
          </List>
        </Stack>
      </Paper>
    </GuideScaffold>
  );
}
