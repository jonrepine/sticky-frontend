import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ======== Configuration ========
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ALLOW_FALLBACK = process.env.OPENAI_ALLOW_FALLBACK === 'true';

const hasApiKey = Boolean(OPENAI_API_KEY && OPENAI_API_KEY.trim().length > 0);

// ======== Helper Functions ========
function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function extractJsonObject(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampInt(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

// ======== Category Doctrine (simplified) ========
const CATEGORY_DOCTRINE = {
  'new-word': {
    slug: 'new-word',
    exactnessMode: 'term_exact',
    targetCardCount: 3,
    deepAttributesSupported: ['source', 'context', 'significance', 'contrast'],
    deepAttributesStronglyPrompted: [],
  },
  'new-word-plus': {
    slug: 'new-word-plus',
    exactnessMode: 'term_exact',
    targetCardCount: 3,
    deepAttributesSupported: ['source', 'context', 'significance', 'usage', 'occasion'],
    deepAttributesStronglyPrompted: ['source', 'context'],
  },
  'fact': {
    slug: 'fact',
    exactnessMode: 'gist',
    targetCardCount: 3,
    deepAttributesSupported: ['source', 'context', 'significance'],
    deepAttributesStronglyPrompted: [],
  },
  'technical-definition': {
    slug: 'technical-definition',
    exactnessMode: 'term_exact',
    targetCardCount: 3,
    deepAttributesSupported: ['domain', 'contrast', 'source', 'significance'],
    deepAttributesStronglyPrompted: [],
  },
  'joke': {
    slug: 'joke',
    exactnessMode: 'phrase_exact',
    targetCardCount: 1,
    deepAttributesSupported: ['source', 'occasion', 'significance'],
    deepAttributesStronglyPrompted: [],
  },
  'virtue-life-lesson': {
    slug: 'virtue-life-lesson',
    exactnessMode: 'gist',
    targetCardCount: 3,
    deepAttributesSupported: ['source', 'context', 'significance', 'application'],
    deepAttributesStronglyPrompted: ['source', 'significance'],
  },
  'quote-proverb-verse': {
    slug: 'quote-proverb-verse',
    exactnessMode: 'phrase_exact',
    targetCardCount: 2,
    deepAttributesSupported: ['source', 'occasion', 'significance'],
    deepAttributesStronglyPrompted: [],
  },
  'contrast-pair': {
    slug: 'contrast-pair',
    exactnessMode: 'term_exact',
    targetCardCount: 3,
    deepAttributesSupported: ['domain', 'significance', 'contrast'],
    deepAttributesStronglyPrompted: ['contrast'],
  },
  'formula-rule': {
    slug: 'formula-rule',
    exactnessMode: 'term_exact',
    targetCardCount: 3,
    deepAttributesSupported: ['usage', 'significance', 'application', 'domain'],
    deepAttributesStronglyPrompted: [],
  },
  'procedure-workflow': {
    slug: 'procedure-workflow',
    exactnessMode: 'gist',
    targetCardCount: 3,
    deepAttributesSupported: ['context', 'significance', 'application'],
    deepAttributesStronglyPrompted: [],
  },
};

function getDoctrineBySlug(slug) {
  return CATEGORY_DOCTRINE[slug] || CATEGORY_DOCTRINE['fact'];
}

// ======== Prompt Context ========
const SHARED_CORE_CONTEXT = `Create flashcards using active recall and minimum-information principles. The goal is not recognition, trivia, or broad exposure. The goal is durable memory through multiple retrieval paths to the same atomic fact.

Each note must contain one core thing to remember, plus any selected deep attributes that belong to that same fact, such as source, context, significance, contrast, or domain.

If deep attributes are selected, they must appear on every generated card, with a brief reminder on the front and the full lower section on the back.

Never split one note into separate facts across multiple cards. Never use true/false or multiple choice.`;

function buildGenerationSystemPrompt(categorySlug) {
  return `${SHARED_CORE_CONTEXT}\n\nCategory: ${categorySlug}\nReturn JSON with noteSpec + cards array.`;
}

// ======== Socratic & NoteSpec Logic ========
function isLikelyOverloadedInput(inputText) {
  const value = inputText.trim().toLowerCase();
  if (!value) return false;
  const tokenCount = value.split(/\s+/).filter(Boolean).length;
  if (tokenCount > 45) return true;
  if (value.split(/[.;]/).filter(Boolean).length > 4) return true;
  return /\b(entire|everything|all of|all about|whole|complete)\b/.test(value);
}

function hasNarrowingSignal(qaContext) {
  return qaContext.some(entry => {
    const typed = String(entry.typedAnswer || '').trim();
    const selected = String(entry.selectedOption || '').trim();
    return typed.length >= 10 || selected.length >= 3;
  });
}

function getSocraticStage(round) {
  if (round <= 1) return 'context';
  if (round === 2) return 'structure';
  return 'disambiguation';
}

function buildCategoryAwareQuestions(input) {
  const stage = getSocraticStage(input.round);
  if (input.round >= input.maxRounds) {
    return {
      round: input.round,
      stage,
      needsFollowUp: false,
      reason: 'Reached configured Socratic round cap.',
      questions: [],
    };
  }

  const overloaded = isLikelyOverloadedInput(input.inputText);
  if (overloaded && !hasNarrowingSignal(input.qaContext)) {
    return {
      round: input.round,
      stage: 'context',
      needsFollowUp: input.round < input.maxRounds,
      reason: 'Input appears overloaded; collecting one atomic target first.',
      questions: [
        {
          id: 'atomicity-check',
          text: 'What single thing should this note help you recall later?',
          options: ['One term', 'One proposition', 'One formula/rule', 'One short sequence'],
        },
      ],
    };
  }

  const questions = [];
  const slug = input.categorySlug.toLowerCase();

  if (input.round === 1) {
    if (slug === 'new-word' || slug === 'new-word-plus') {
      questions.push({
        id: 'meaning-check',
        text: 'What does this word mean in simple terms?',
        options: ['Short definition', 'Usage meaning', 'Still unsure'],
      });
    } else if (slug === 'technical-definition') {
      questions.push({ id: 'domain-check', text: 'What field/domain is this from?' });
    }
  }

  questions.push({
    id: 'anchor-check',
    text: 'Where did you encounter this? Should we track source/context for better recall?',
    options: ['Track source + context', 'Source only', 'Not important'],
  });

  const limited = questions.slice(0, 4);
  return {
    round: input.round,
    stage,
    needsFollowUp: limited.length > 0 && input.round < input.maxRounds,
    reason: limited.length > 0 ? 'Collecting only missing category-critical fields.' : 'Enough context to generate.',
    questions: limited,
  };
}

function inferCoreAnswer(inputText, categorySlug, qaContext) {
  const raw = inputText.trim();
  if (!raw) return 'unknown';

  if (categorySlug === 'new-word' || categorySlug === 'new-word-plus') {
    const token = raw.split(/[\s,:;()]+/).find(Boolean);
    return token || raw;
  }

  const firstLine = raw.split(/\n+/)[0]?.trim() || raw;
  if (firstLine.includes(':')) {
    const left = firstLine.split(':')[0]?.trim();
    if (left) return left;
  }
  return firstLine.length > 120 ? `${firstLine.slice(0, 117).trim()}...` : firstLine;
}

const DEEP_ATTRIBUTE_ORDER = ['source', 'context', 'significance', 'usage', 'domain', 'contrast', 'occasion', 'application'];

const REMINDER_LABEL = {
  source: 'source',
  context: 'context',
  significance: 'why it matters',
  usage: 'usage',
  domain: 'domain',
  contrast: 'contrast',
  occasion: 'occasion',
  application: 'application',
};

function detectDeepAttributes(text) {
  const value = text.toLowerCase();
  const attrs = [];
  if (/\b(source|where did|encountered|heard|read)\b/.test(value)) attrs.push('source');
  if (/\b(context|usage|used|situation|scene)\b/.test(value)) attrs.push('context');
  if (/\b(why|significance|matters|important)\b/.test(value)) attrs.push('significance');
  if (/\bdomain|field\b/.test(value)) attrs.push('domain');
  if (/\bcontrast|confuse|confusable|opposite|versus\b/.test(value)) attrs.push('contrast');
  return attrs;
}

function buildFrontReminder(selected) {
  if (selected.length === 0) return undefined;
  const labels = selected.map(attr => REMINDER_LABEL[attr]).filter(Boolean);
  if (labels.length === 0) return undefined;
  return `Also recall: ${labels.join(' • ')}`;
}

function buildNoteSpec(input) {
  const doctrine = getDoctrineBySlug(input.categorySlug);
  const exactnessMode = doctrine?.exactnessMode || 'gist';
  const supported = new Set(doctrine?.deepAttributesSupported || []);
  const stronglyPrompted = new Set(doctrine?.deepAttributesStronglyPrompted || []);

  const deepAttributes = {};
  const notImportant = new Set();

  input.qaContext.forEach(entry => {
    const question = String(entry.question || '');
    const answer = String(entry.typedAnswer || entry.selectedOption || '').trim();
    const attrs = detectDeepAttributes(`${question} ${answer}`);
    if (attrs.length === 0) return;
    if (entry.notImportant) {
      attrs.forEach(attr => notImportant.add(attr));
      return;
    }
    attrs.forEach(attr => {
      if (answer) deepAttributes[attr] = answer;
    });
  });

  stronglyPrompted.forEach(attr => {
    if (!notImportant.has(attr) && !deepAttributes[attr]) {
      deepAttributes[attr] = 'Captured in session context';
    }
  });

  const selectedDeepAttributes = DEEP_ATTRIBUTE_ORDER.filter(
    attr => (!supported.size || supported.has(attr)) && !notImportant.has(attr) && Boolean(deepAttributes[attr])
  );

  return {
    categorySlug: input.categorySlug || 'fact',
    coreAnswer: inferCoreAnswer(input.inputText, input.categorySlug, input.qaContext),
    coreExplanation: input.inputText.trim().slice(0, 180),
    exactnessMode,
    deepAttributes,
    selectedDeepAttributes,
    frontReminderText: buildFrontReminder(selectedDeepAttributes),
    maxIndependentFactsPerNote: 1,
  };
}

function buildRejectionCard() {
  return {
    front: 'This note was overloaded.',
    back: 'You tried to put too much in one card. Delete this card and try again.',
    selectedByDefault: true,
    cardType: 'rejection',
  };
}

function buildFallbackCards(inputText, categoryName, categorySlug, config) {
  const target = config.targetCardCount || 3;
  const cards = [];
  for (let i = 0; i < target; i++) {
    cards.push({
      front: `What is ${inputText.trim().split(/\s+/).slice(0, 5).join(' ')}?`,
      back: inputText.trim().slice(0, 200),
      selectedByDefault: true,
      cardType: 'direct_qa',
    });
  }
  return { cards };
}

function creativityToTemperature(level) {
  const normalized = clampInt(level, 1, 4, 2);
  return 0.2 + (normalized - 1) * 0.2;
}

async function openAiJsonCall(options) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      temperature: options.temperature || 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const parsed = extractJsonObject(content);
  if (!parsed) throw new Error('Failed to parse model JSON response');
  return parsed;
}

function normalizeGenerationConfig(raw) {
  const input = typeof raw === 'object' && raw !== null ? raw : {};
  return {
    targetCardCount: clampInt(input.targetCardCount, 1, 8, 3),
    creativityLevel: clampInt(input.creativityLevel, 1, 4, 2),
    deviationAllowance: clampInt(input.deviationAllowance, 1, 4, 1),
    maxSocraticRounds: clampInt(input.maxSocraticRounds, 1, 3, 2),
    customInstructions: typeof input.customInstructions === 'string' ? input.customInstructions.trim().slice(0, 4000) : '',
  };
}

function parseModelCards(raw) {
  const cardsRaw = Array.isArray(raw) ? raw : [];
  return cardsRaw
    .map(card => ({
      front: String(card.front || '').trim(),
      back: String(card.back || '').trim(),
      selectedByDefault: card.selectedByDefault !== false,
      cardType: String(card.cardType || '').trim() || undefined,
    }))
    .filter(card => card.front && card.back)
    .slice(0, 8);
}

// ======== Routes ========
app.get('/api/llm/status', (req, res) => {
  sendJson(res, 200, {
    provider: hasApiKey ? 'openai' : 'fallback',
    model: OPENAI_MODEL,
    hasApiKey,
    fallbackEnabled: ALLOW_FALLBACK,
    live: hasApiKey,
  });
});

app.post('/api/llm/socratic-questions', async (req, res) => {
  try {
    const { inputText, categoryName, categorySlug, qaContext, round, maxRounds, generationConfig } = req.body;

    if (!inputText || !inputText.trim()) {
      return sendJson(res, 400, { error: 'inputText is required' });
    }

    if (!hasApiKey && !ALLOW_FALLBACK) {
      return sendJson(res, 500, { error: 'LLM is not configured. Set OPENAI_API_KEY or enable OPENAI_ALLOW_FALLBACK=true.' });
    }

    const config = normalizeGenerationConfig(generationConfig);
    const roundVal = Number.isFinite(Number(round)) ? Math.max(1, Math.floor(Number(round))) : 1;
    const maxRoundsVal = Number.isFinite(Number(maxRounds)) ? Math.max(1, Math.min(3, Math.floor(Number(maxRounds)))) : config.maxSocraticRounds;

    const socraticResponse = buildCategoryAwareQuestions({
      inputText: inputText.trim(),
      categoryName: categoryName || 'General',
      categorySlug: categorySlug || 'general',
      qaContext: Array.isArray(qaContext) ? qaContext : [],
      round: roundVal,
      maxRounds: maxRoundsVal,
    });

    sendJson(res, 200, socraticResponse);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

app.post('/api/llm/generate-cards', async (req, res) => {
  try {
    const { inputText, categoryName, categorySlug, tags, socraticEnabled, qaContext, generationConfig } = req.body;

    if (!inputText || !inputText.trim()) {
      return sendJson(res, 400, { error: 'inputText is required' });
    }

    if (!hasApiKey && !ALLOW_FALLBACK) {
      return sendJson(res, 500, { error: 'LLM is not configured. Set OPENAI_API_KEY or enable OPENAI_ALLOW_FALLBACK=true.' });
    }

    const config = normalizeGenerationConfig(generationConfig);
    const qaCont = Array.isArray(qaContext) ? qaContext : [];
    const overloaded = isLikelyOverloadedInput(inputText.trim());
    const narrowed = hasNarrowingSignal(qaCont);

    if (overloaded && !narrowed) {
      return sendJson(res, 200, {
        factAnchor: inputText.trim(),
        coherencePassed: false,
        coherenceWarnings: ['Input is overloaded and needs narrowing before card generation.'],
        noteSpec: null,
        validatorFlags: {},
        cards: [buildRejectionCard()],
      });
    }

    const noteSpec = buildNoteSpec({
      inputText: inputText.trim(),
      categorySlug: categorySlug || 'fact',
      categoryName: categoryName || 'General',
      qaContext: qaCont,
      generationConfig: config,
    });

    let modelCards = [];
    if (hasApiKey) {
      try {
        const parsed = await openAiJsonCall({
          apiKey: OPENAI_API_KEY,
          model: OPENAI_MODEL,
          temperature: creativityToTemperature(config.creativityLevel),
          systemPrompt: buildGenerationSystemPrompt(categorySlug || 'fact'),
          userPrompt: `Input: ${inputText.trim()}\nCategoryName: ${categoryName || 'General'}\nCategorySlug: ${categorySlug || 'fact'}\nTags: ${JSON.stringify(tags || [])}\nReturn noteSpec + cards.`,
        });
        modelCards = parseModelCards(parsed.cards);
      } catch (err) {
        console.error('OpenAI call failed:', err);
      }
    }

    if (modelCards.length === 0) {
      modelCards = buildFallbackCards(inputText.trim(), categoryName || 'General', categorySlug || 'fact', config).cards;
    }

    sendJson(res, 200, {
      factAnchor: noteSpec.coreAnswer,
      coherencePassed: true,
      coherenceWarnings: [],
      noteSpec,
      validatorFlags: {},
      cards: modelCards.slice(0, config.targetCardCount),
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

app.get('/health', (req, res) => {
  sendJson(res, 200, { status: 'ok', service: 'sticky-llm-api' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sticky LLM API running on http://0.0.0.0:${PORT}`);
  console.log(`OpenAI configured: ${hasApiKey}`);
  console.log(`Fallback enabled: ${ALLOW_FALLBACK}`);
});
