import 'dotenv/config';  // Add this as first import
import 'dotenv/config';
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

Never split one note into separate facts across multiple cards.
Never use true/false or multiple choice.

Ask only for missing information through short Socratic questions.
If the user is vague, narrow the target.

If the user tries to overload a card with too many independent facts, steer them toward one specific thing to remember.
If they still want a small set of tightly related facts, keep that same set on every card as one coherent target.

If they continue pushing after clarification for an unreasonable amount of facts or a topic too broad, generate a rejection card instead.`;

const CATEGORY_CONTEXT = {
  'new-word': `Category: new-word
This category is for learning one new word so it is usable, not just familiar.

Generate exactly 3 cards that all resolve to the same target word:
1) contextual cloze -> word
2) definition/concept/scenario -> word
3) association cue (synonym, antonym, or contrast) -> word

Do not create separate cards for separate meanings unless the user clearly requests a different note.
If source/context/significance are selected, include them on every card with front reminder + back lower section.
If user attempts too many words or themes in one note, narrow to one word. If still overloaded, reject.`,
  'new-word-plus': `Category: new-word-plus
This category is for learning one word/phrase/saying together with source-context that made it memorable.

Treat this as one atomic memory bundle: core answer is still the target word/phrase; source/context/significance are deep attributes, not separate facts.

Generate exactly 3 cards:
1) contextual cloze -> word/phrase
2) concept/scenario -> word/phrase
3) association cue -> word/phrase

If source/context/significance are selected, all cards must include front reminder and back lower section.
If user marks a deep attribute as not important, scrub it completely from final cards.
If user tries to combine several words/sayings/source bodies, narrow to one target. If persistent overload, reject.`,
  'fact': `Category: fact
This category is for one proposition, claim, relationship, date, cause-effect link, identity, or concrete fact.

Generate up to 3 cards that all resolve to the same fact:
1) direct recall
2) contextual cloze
3) application/correction/contrast card that still resolves to the same answer

Do not spread separate facts across cards.
If source/context/significance are selected, include them on every card.
If input is broad (whole topic/chapter/doctrine/field), narrow to one concrete claim; reject if user persists with overload.`,
  'technical-definition': `Category: technical-definition
This category is for one domain-specific term remembered precisely enough to distinguish from nearby concepts.

Generate exactly 3 cards:
1) concept/scenario -> term
2) contextual cloze in domain sentence
3) contrast cue -> term (contrast supports target, not a second topic)

Always include domain if known.
If domain/contrast/source/significance are selected, include them on every card.
If user tries to learn glossary/framework/multiple definitions in one note, narrow to one term; reject if overload persists.`,
  'joke': `Category: joke
This category is for remembering one joke as a performable unit.

By default generate exactly 1 card unless user clearly requests chunking for very long joke.
Front cues recitation. Back begins with full joke text.

Do not generate explanation cards.
If source/occasion/significance are selected, include as deep attributes on the same card.
If user attempts many jokes or broad material, narrow to one joke; reject if persistent overload.`,
  'virtue-life-lesson': `Category: virtue-life-lesson
This category is for one principle/lesson with origin and personal significance attached.

Generate exactly 3 cards that all resolve to the same principle:
1) scenario -> principle
2) source/event -> principle
3) application prompt -> principle

Source/context/significance are deep attributes of same lesson.
If selected, include on every card with front reminder + back lower section.
If user provides worldview/essay/many lessons, narrow to one principle; reject if overload persists.`,
  'quote-proverb-verse': `Category: quote-proverb-verse
This category is for one line/quote/proverb/verse with high fidelity.

Generate 2 cards by default:
1) cue -> full recitation
2) completion/cloze -> full phrase

Wording is the core answer; source/significance/occasion are attached attributes when selected.
If selected, include them on every card.
If user attempts very long passage/chapter/body of text, narrow to one short line/chunk; reject if persistent overload.`,
  'contrast-pair': `Category: contrast-pair
This category is for one target item strengthened by contrast with a confusable alternative.

Generate exactly 3 cards that all resolve to the same target answer:
1) contrast discrimination
2) scenario -> target
3) correction prompt -> target

Contrast item is support, not second equal topic.
If domain/significance/contrast explanation are selected, include on every card.
If user attempts many confusable families in one note, narrow to one target-vs-one contrast; reject if overload persists.`,
  'formula-rule': `Category: formula-rule
This category is for one formula/law/rule/heuristic/structured expression.

Generate exactly 3 cards:
1) direct recall of formula/rule
2) completion/cloze
3) application card asking when/why same formula applies

Do not split into multiple topics unless intentionally creating separate notes.
If usage/significance/application are selected, include on every card.
If user attempts theorem set/proof/many rules at once, narrow to one formula/rule; reject if overload persists.`,
  'procedure-workflow': `Category: procedure-workflow
This category is for one short cohesive procedure that can be treated as one memory unit.

Generate up to 3 cards that all resolve to same procedure:
1) cue -> sequence
2) next-step prompt
3) contextual cloze

Use sparingly. Long workflows should be split into multiple notes.
If context/significance/application are selected, include on every card.
If user attempts large process/system/many procedures in one note, narrow to one short sub-procedure; reject if persistent overload.`,
};

const REJECTION_CONTEXT = `Rejection/overload fallback:
If overloaded after clarification attempts, generate exactly one rejection card.

Front: This note is overloaded.
Back: Too much information on this card. Delete it and try again with one smaller, more specific thing to remember.`;

const ABUSE_PREVENTION_CONTEXT = `Abuse prevention and scope control:
Enforce one atomic learning target per note.

A small structured bundle is allowed when it is one coherent unit (typically 2-5 tightly related items), such as:
- four heads of quadriceps
- three branches of government
- short procedure steps

In those cases, the list itself is the single target and must appear consistently across all cards.

Deep attributes (source/context/significance/domain/contrast/application/occasion/usage) are supporting attributes, not separate independent facts.

Do not allow large lists, long passages, entire chapters, or broad subjects in one note.
If user captures excessively broad material, force narrowing with short Socratic guidance.
If user still insists on overload, output only the rejection card.`;

function getCategoryPromptContext(categorySlug) {
  const slug = categorySlug.trim().toLowerCase();
  return CATEGORY_CONTEXT[slug] || CATEGORY_CONTEXT['fact'] || 'Category: fact. One concrete proposition only; reject persistent overload.';
}

function buildGenerationSystemPrompt(categorySlug) {
  return [
    SHARED_CORE_CONTEXT,
    getCategoryPromptContext(categorySlug),
    REJECTION_CONTEXT,
    ABUSE_PREVENTION_CONTEXT,
    `Return JSON only with shape:
{
  "noteSpec": {
    "coreAnswer": "string",
    "coreExplanation": "string",
    "selectedDeepAttributes": ["source","context","significance"],
    "deepAttributes": { "source": "string", "context": "string", "significance": "string" }
  },
  "cards": [{ "front": "string", "back": "string", "selectedByDefault": true, "cardType": "string" }]
}`,
  ].join('\n\n');
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
