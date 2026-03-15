import { Badge, Button, Group, List, Paper, SimpleGrid, Stack, Text, Title, useMantineColorScheme } from "@mantine/core";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { GuideCallout, GuideScaffold } from "./GuideScaffold";
import { StickyRetentionCurveFigure } from "./StickyRetentionCurveFigure";
import { useAuth } from "../../lib/auth/AuthContext";
import { getSubtleSectionStyle } from "../../lib/ui/glass";

const MEMORY_PILLARS = [
  {
    emoji: "💡",
    title: "Understand first",
    body: "If the fact does not make sense yet, memory has nothing stable to grab onto.",
  },
  {
    emoji: "🧠",
    title: "Retrieve on purpose",
    body: "Closing the page and pulling the answer out is the training effect. Seeing it again is not.",
  },
  {
    emoji: "⏳",
    title: "Return later",
    body: "Spacing works because the brain has to rebuild the path just as it starts fading.",
  },
];

const MEMORY_EXAMPLES = [
  {
    emoji: "📚",
    title: "A new word",
    body: "Use context, production, and association. Recognition alone is too weak.",
  },
  {
    emoji: "🌍",
    title: "A plain fact",
    body: "Ask the same truth from a few angles instead of stuffing three truths into one card.",
  },
  {
    emoji: "🧪",
    title: "A technical term",
    body: "Anchor it in domain, contrast, and use-case so it is not just dead dictionary text.",
  },
  {
    emoji: "🎭",
    title: "A quote or joke",
    body: "Treat it like recitation when wording matters. Test the way you want to remember it.",
  },
  {
    emoji: "🧭",
    title: "A principle",
    body: "Attach source, situation, and application so the idea has practical glue.",
  },
];

const BAD_INPUTS = [
  "“Remember the Bible”",
  "“Learn all networking”",
  "“Memorise this whole chapter”",
];

export function HowToRememberPage() {
  const { isAuthenticated } = useAuth();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <GuideScaffold
      mode="public"
      eyebrow="🧠 Memory science, minus the textbook voice"
      title="How to remember things so they actually stick"
      lead="Familiarity feels smooth. Retrieval builds memory. The goal is not to see facts more often. The goal is to be able to pull them back when you need them."
      heroQuote="“Familiarity is not recall.”"
      heroActions={
        <Group gap="sm" wrap="wrap">
          <Button
            component={Link}
            to={isAuthenticated ? "/how-to-use-sticky" : "/signup"}
            radius="xl"
            rightSection={<IconArrowRight size={16} />}
          >
            {isAuthenticated ? "See how Sticky uses this" : "Try Sticky"}
          </Button>
          <Button component={Link} to={isAuthenticated ? "/new" : "/login"} variant="subtle" color="gray" radius="xl">
            {isAuthenticated ? "Open capture" : "Sign in"}
          </Button>
        </Group>
      }
    >
      <Stack gap="sm">
        <Badge color="grape" variant="light" radius="xl" w="fit-content">
          The short version
        </Badge>
        <Title order={2}>The best memory loop is simple, but not always comfortable.</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          First, understand the fact. Then force yourself to retrieve it. Then revisit it after a delay.
          That is the pattern the research keeps pointing back to. Spacing helps. Testing helps.
          Cramming and rereading mainly create the feeling that you know something.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {MEMORY_PILLARS.map((pillar) => (
          <GuideCallout key={pillar.title} emoji={pillar.emoji} title={pillar.title}>
            {pillar.body}
          </GuideCallout>
        ))}
      </SimpleGrid>

      <Paper p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Stack gap="sm">
          <Badge color="brand" variant="light" radius="xl" w="fit-content">
            Use this with Sticky
          </Badge>
          <Title order={2}>🛠️ Understand it first, then put it into Sticky.</Title>
          <Text c="dimmed" style={{ lineHeight: 1.75 }}>
            The practical version is simple. Do not rush unclear material straight into cards. First make sure you
            actually understand the fact, term, or idea. Then capture that one honest unit in Sticky, let the app help
            shape the cards, and come back later for retrieval when it is due.
          </Text>
          <List spacing="xs" icon={<IconCheck size={16} />}>
            <List.Item>Make sure the fact makes sense to you first.</List.Item>
            <List.Item>Capture one thing, not a whole chapter or vague project.</List.Item>
            <List.Item>Let Sticky ask follow-up questions when context or precision matters.</List.Item>
            <List.Item>Review the cards later instead of rereading the source again and again.</List.Item>
          </List>
          <Group gap="sm" wrap="wrap">
            <Button
              component={Link}
              to={isAuthenticated ? "/how-to-use-sticky" : "/signup"}
              radius="xl"
              rightSection={<IconArrowRight size={16} />}
            >
              {isAuthenticated ? "See the Sticky workflow" : "Try Sticky"}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Stack gap="sm">
        <Title order={2}>🔁 Why rereading feels productive and still fails later</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          Rereading, highlighting, and cramming make material feel increasingly familiar. That is the trap.
          Familiarity is a recognition signal, not proof of recall. When the page disappears and the brain has to
          rebuild the answer alone, the illusion shows up fast.
        </Text>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          Retrieval practice flips that around. The moment of strain is the point. When you have to reconstruct the
          answer, you strengthen the path that will matter later on an exam, during conversation, or in clinic.
        </Text>
      </Stack>

      <Paper p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Stack gap="xs">
          <Badge color="brand" variant="light" radius="xl" w="fit-content">
            What the evidence keeps saying
          </Badge>
          <Text fw={700}>Spacing and self-testing are unusually good bets for long-term retention.</Text>
          <Text c="dimmed" size="sm" style={{ lineHeight: 1.7 }}>
            Large reviews of the learning literature keep finding the same pattern: study spread out over time beats one
            dense block, and retrieval practice tends to beat restudy when the test comes later.
          </Text>
        </Stack>
      </Paper>

      <StickyRetentionCurveFigure />

      <Stack gap="sm">
        <Title order={2}>🏥 Why spaced repetition became a med-school obsession</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          Medicine is a brutal memory problem. The challenge is not knowing something until Friday. It is keeping a huge
          body of factual and conceptual knowledge alive for months and years. That is exactly where spaced retrieval has
          an edge: not because it is magical, but because it matches the job.
        </Text>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          The scheduler matters because it tries to catch a fact near the edge of forgetting, when recall is effortful but
          still recoverable. Get it right and the interval stretches: maybe later today, then in a few days, then a couple
          of weeks, then a month, then a season. What once felt fragile can eventually become something you only revisit a
          few times a year and still remember cleanly.
        </Text>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          The catch is that spaced repetition only shines when the cards are good. If the cards are overloaded,
          ambiguous, or badly phrased, the system schedules confusion instead of learning.
        </Text>
        <Paper p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
          <Stack gap="xs">
            <Badge color="brand" variant="light" radius="xl" w="fit-content">
              The motivating part
            </Badge>
            <Text fw={700}>
              A few well-timed reviews can buy back an absurd amount of future recall.
            </Text>
            <Text c="dimmed" size="sm" style={{ lineHeight: 1.7 }}>
              That is the appeal. You are not trying to brute-force memory every night forever. You are trying to meet a
              fact at the right moments so the forgetting curve keeps getting pushed outward, until something that once
              needed daily help survives for months or even years.
            </Text>
          </Stack>
        </Paper>
      </Stack>

      <Stack gap="sm">
        <Title order={2}>🗂️ Not every fact wants the same card</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          A good system respects the shape of the thing you are trying to remember. A word, a technical definition, a
          quote, and a life lesson should not all be forced into the same blunt flashcard template.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {MEMORY_EXAMPLES.map((item) => (
          <GuideCallout key={item.title} emoji={item.emoji} title={item.title}>
            {item.body}
          </GuideCallout>
        ))}
      </SimpleGrid>

      <Stack gap="sm">
        <Title order={2}>🚫 The inputs that good memory tools should reject</Title>
        <Text c="dimmed" style={{ lineHeight: 1.75 }}>
          The right move is often to narrow the scope before you generate anything at all. One term. One proposition.
          One short list. One quote. One principle. One small procedure.
        </Text>
        <List
          spacing="sm"
          icon={
            <Badge color="red" variant="light" radius="xl">
              no
            </Badge>
          }
        >
          {BAD_INPUTS.map((entry) => (
            <List.Item key={entry}>
              <Text>{entry}</Text>
            </List.Item>
          ))}
        </List>
      </Stack>

      <Paper p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Stack gap="sm">
          <Badge color="grape" variant="light" radius="xl" w="fit-content">
            Why Sticky exists
          </Badge>
          <Title order={3}>The review is not the hard part. The setup usually is.</Title>
          <Text c="dimmed" style={{ lineHeight: 1.75 }}>
            Sticky tries to keep the science intact, while removing the “become a flashcard engineer first” tax.
            You capture one thing, answer clarifying questions only when they help, keep the card options that look honest,
            and move on.
          </Text>
          <List
            spacing="xs"
            icon={<IconCheck size={16} />}
          >
            <List.Item>Active recall still matters.</List.Item>
            <List.Item>Spacing still matters.</List.Item>
            <List.Item>Card shape still matters.</List.Item>
            <List.Item>The workflow just asks less of you up front.</List.Item>
          </List>
        </Stack>
      </Paper>
    </GuideScaffold>
  );
}
