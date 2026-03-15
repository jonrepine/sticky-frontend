import { Paper, Tabs, useMantineColorScheme } from "@mantine/core";
import { IconCards, IconFlag } from "@tabler/icons-react";
import { InfoBitListPage } from "../infobits/InfoBitListPage";
import { FlagsPage } from "../flags/FlagsPage";
import { getGlassChromeStyle, getSubtleSectionStyle } from "../../lib/ui/glass";

/**
 * Unified management surface for cards/info-bits and flags.
 */
export function MyCardsPage() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs defaultValue="cards" keepMounted={false}>
      <Paper p={6} radius="xl" style={getGlassChromeStyle(isDark)}>
        <Tabs.List grow>
          <Tabs.Tab value="cards" leftSection={<IconCards size={16} />}>
            Cards
          </Tabs.Tab>
          <Tabs.Tab value="flags" leftSection={<IconFlag size={16} />}>
            Flagged
          </Tabs.Tab>
        </Tabs.List>
      </Paper>

      <Tabs.Panel value="cards" pt="md">
        <Paper p="md" radius="2rem" style={getSubtleSectionStyle(isDark)}>
          <InfoBitListPage />
        </Paper>
      </Tabs.Panel>

      <Tabs.Panel value="flags" pt="md">
        <Paper p="md" radius="2rem" style={getSubtleSectionStyle(isDark)}>
          <FlagsPage />
        </Paper>
      </Tabs.Panel>
    </Tabs>
  );
}

