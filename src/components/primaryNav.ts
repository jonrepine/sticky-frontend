import { IconBook2, IconCards, IconPlus, IconStack2 } from "@tabler/icons-react";

export const PRIMARY_NAV_ITEMS = [
  {
    label: "Learn",
    icon: IconBook2,
    path: "/learn",
    description: "Warm up fresh cards",
    showDue: true,
  },
  {
    label: "New",
    icon: IconPlus,
    path: "/new",
    description: "Capture the next fact",
    showDue: false,
  },
  {
    label: "Review",
    icon: IconCards,
    path: "/review",
    description: "Recall what is due",
    showDue: true,
  },
  {
    label: "My Cards",
    icon: IconStack2,
    path: "/my-cards",
    description: "Browse and edit saved cards",
    showDue: false,
  },
] as const;

export const DOCK_NAV_ITEMS = PRIMARY_NAV_ITEMS.filter(
  (item) => item.path !== "/my-cards"
);

export const WORKSPACE_NAV_ITEMS = PRIMARY_NAV_ITEMS.filter(
  (item) => item.path !== "/my-cards"
);

export type PrimaryNavItem = (typeof PRIMARY_NAV_ITEMS)[number];
export type WorkspaceNavItem = (typeof WORKSPACE_NAV_ITEMS)[number];

export function isPrimaryPathActive(currentPath: string, itemPath: string): boolean {
  if (itemPath === "/my-cards") {
    return currentPath === "/my-cards" || currentPath.startsWith("/infobits/");
  }

  return currentPath === itemPath;
}
