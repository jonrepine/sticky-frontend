import { Text, Image } from "@mantine/core";
import type { ContentBlock } from "../types";

interface Props {
  blocks: ContentBlock[];
}

export function BlockContent({ blocks }: Props) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return (
              <Text
                key={i}
                size="md"
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}
              >
                {block.text}
              </Text>
            );
          case "image":
            return (
              <Image
                key={i}
                src={block.url}
                alt={block.alt ?? ""}
                maw={400}
                radius="sm"
              />
            );
          case "audio":
            return <audio key={i} src={block.url} controls />;
          default:
            return null;
        }
      })}
    </>
  );
}
