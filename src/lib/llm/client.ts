import type {
  ExistingCardContext,
  GenerateCardsResponse,
  LlmGenerationConfig,
  SocraticAnswer,
  SocraticQuestionsResponse,
} from "./types";

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (json && typeof json.error === "string" && json.error) ||
      `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return json as T;
}

export function fetchSocraticQuestions(input: {
  inputText: string;
  categoryName: string;
  categorySlug?: string;
  categoryKey?: string;
  tags: string[];
  qaContext?: SocraticAnswer[];
  round?: number;
  maxRounds?: number;
  generationConfig?: LlmGenerationConfig;
}) {
  return postJson<SocraticQuestionsResponse>("/api/llm/socratic-questions", input);
}

export function fetchGeneratedCards(input: {
  inputText: string;
  categoryName: string;
  categorySlug?: string;
  categoryKey?: string;
  tags: string[];
  socraticEnabled: boolean;
  qaContext: SocraticAnswer[];
  editInstruction?: string;
  existingCards?: ExistingCardContext[];
  generationConfig?: LlmGenerationConfig;
}) {
  return postJson<GenerateCardsResponse>("/api/llm/generate-cards", input);
}

