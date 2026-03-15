import {
  Title,
  Text,
  Stack,
  Group,
  Tabs,
  Alert,
  Code,
} from "@mantine/core";
import { IconFlask, IconApi, IconScale } from "@tabler/icons-react";
import { LocalSimulator } from "./LocalSimulator";
import { ApiTester } from "./ApiTester";
import { ComparisonRunner } from "./ComparisonRunner";

export function PlaygroundPage() {
  return (
    <Stack gap="lg">
      <Group>
        <IconFlask size={28} />
        <div>
          <Title order={2}>FSRS Playground</Title>
          <Text size="sm" c="dimmed">
            Test the FSRS algorithm locally and against the API. This page is
            independent of the main app.
          </Text>
        </div>
      </Group>

      <Alert variant="light" color="blue">
        <Text size="sm">
          This playground lets you simulate FSRS scheduling client-side (using{" "}
          <Code>ts-fsrs v5</Code>), test the backend API, and compare results
          side-by-side. Fuzz is disabled locally for deterministic comparisons.
        </Text>
      </Alert>

      <Tabs defaultValue="local">
        <Tabs.List>
          <Tabs.Tab value="local" leftSection={<IconFlask size={16} />}>
            Local Simulator
          </Tabs.Tab>
          <Tabs.Tab value="api" leftSection={<IconApi size={16} />}>
            API Tester
          </Tabs.Tab>
          <Tabs.Tab value="compare" leftSection={<IconScale size={16} />}>
            Compare
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="local" pt="md">
          <LocalSimulator />
        </Tabs.Panel>

        <Tabs.Panel value="api" pt="md">
          <ApiTester />
        </Tabs.Panel>

        <Tabs.Panel value="compare" pt="md">
          <ComparisonRunner />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
