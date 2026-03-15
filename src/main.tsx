import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import { App } from "./App";

const theme = createTheme({
  colors: {
    brand: [
      "#f1fde7",
      "#dcf9c7",
      "#c2f29a",
      "#aae96b",
      "#97e247",
      "#8bdd31",
      "#82d62a",
      "#6daf20",
      "#588a19",
      "#456d12",
    ],
  },
  primaryColor: "brand",
  fontFamily: '"Avenir Next", Avenir, "Helvetica Neue", "Segoe UI", sans-serif',
  defaultRadius: "xl",
  autoContrast: true,
  headings: {
    fontFamily: '"Avenir Next", Avenir, "Helvetica Neue", "Segoe UI", sans-serif',
    fontWeight: "650",
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </StrictMode>
);
