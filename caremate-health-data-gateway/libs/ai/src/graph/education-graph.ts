import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import {
  SYSTEM_PROMPT,
  classifyUserMessage,
  type SafetyDecision,
} from '../safety/policy';
import {
  MODEL_REQUEST_TIMEOUT_MS,
  withModelTimeout,
} from './model-errors';

export type EducationHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type EducationGraphResult = {
  reply: string;
  safety: SafetyDecision;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  /** Wall time for classify + generate (ms). */
  latencyMs: number;
};

/** Keep enough turns for pronouns/follow-ups without blowing Lambda time/cost. */
export const MAX_HISTORY_MESSAGES = 16;
/** Rough char budget for prior turns (~2k tokens); current user message is separate. */
export const MAX_HISTORY_CHARS = 8_000;

const GraphState = Annotation.Root({
  userMessage: Annotation<string>,
  priorMessages: Annotation<EducationHistoryMessage[]>,
  safety: Annotation<SafetyDecision | null>,
  reply: Annotation<string>,
  model: Annotation<string>,
  promptTokens: Annotation<number | null>,
  completionTokens: Annotation<number | null>,
});

type GraphStateType = typeof GraphState.State;

function buildModel(apiKey: string, modelName: string): ChatOpenAI {
  return new ChatOpenAI({
    apiKey,
    model: modelName,
    temperature: 0.3,
    maxTokens: 1000,
    // Provider-side deadline; generate also races AbortSignal for a hard cap.
    timeout: MODEL_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
}

/**
 * Keep the most recent prior turns that fit message + char budgets.
 * Input must be chronological (oldest → newest). Current user turn is excluded.
 */
export function selectBoundedHistory(
  messages: EducationHistoryMessage[],
  options: {
    maxMessages?: number;
    maxChars?: number;
  } = {},
): EducationHistoryMessage[] {
  const maxMessages = options.maxMessages ?? MAX_HISTORY_MESSAGES;
  const maxChars = options.maxChars ?? MAX_HISTORY_CHARS;

  const cleaned = messages
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  const selected: EducationHistoryMessage[] = [];
  let chars = 0;

  for (let i = cleaned.length - 1; i >= 0; i -= 1) {
    const msg = cleaned[i];
    const nextChars = chars + msg.content.length;
    if (selected.length >= maxMessages || nextChars > maxChars) {
      break;
    }
    selected.push(msg);
    chars = nextChars;
  }

  return selected.reverse();
}

function toLangChainMessages(
  prior: EducationHistoryMessage[],
  userMessage: string,
): BaseMessage[] {
  const out: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];
  for (const msg of prior) {
    if (msg.role === 'user') {
      out.push(new HumanMessage(msg.content));
    } else {
      out.push(new AIMessage(msg.content));
    }
  }
  out.push(new HumanMessage(userMessage));
  return out;
}

/**
 * Phase 1 LangGraph: classify → safety gate → generate (or short-circuit).
 * Safety classifies the **current** user message only; prior turns are context for generate.
 */
export function createEducationGraph(apiKey: string, modelName: string) {
  const model = buildModel(apiKey, modelName);

  const classify = async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const safety = classifyUserMessage(state.userMessage);
    return { safety };
  };

  const applySafety = async (
    state: GraphStateType,
  ): Promise<Partial<GraphStateType>> => {
    const safety = state.safety;
    if (!safety) {
      return {};
    }
    if (safety.action === 'emergency' || safety.action === 'refuse') {
      return {
        reply: safety.reply ?? '',
        model: 'policy',
        promptTokens: 0,
        completionTokens: 0,
      };
    }
    return {};
  };

  const generate = async (
    state: GraphStateType,
  ): Promise<Partial<GraphStateType>> => {
    if (state.safety && state.safety.action !== 'allow') {
      return {};
    }
    const prior = selectBoundedHistory(state.priorMessages ?? []);
    const messages = toLangChainMessages(prior, state.userMessage);
    const response = await withModelTimeout((signal) =>
      model.invoke(messages, { signal }),
    );
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    const usage = response.usage_metadata;
    return {
      reply: content.trim(),
      model: modelName,
      promptTokens: usage?.input_tokens ?? null,
      completionTokens: usage?.output_tokens ?? null,
    };
  };

  const routeAfterSafety = (state: GraphStateType): string => {
    if (state.safety && state.safety.action !== 'allow') {
      return END;
    }
    return 'generate';
  };

  return new StateGraph(GraphState)
    .addNode('classify', classify)
    .addNode('applySafety', applySafety)
    .addNode('generate', generate)
    .addEdge(START, 'classify')
    .addEdge('classify', 'applySafety')
    .addConditionalEdges('applySafety', routeAfterSafety, {
      [END]: END,
      generate: 'generate',
    })
    .addEdge('generate', END)
    .compile();
}

export async function runEducationGraph(input: {
  apiKey: string;
  modelName: string;
  userMessage: string;
  priorMessages?: EducationHistoryMessage[];
}): Promise<EducationGraphResult> {
  const started = Date.now();
  const priorMessages = selectBoundedHistory(input.priorMessages ?? []);
  const graph = createEducationGraph(input.apiKey, input.modelName);
  const finalState = await graph.invoke({
    userMessage: input.userMessage,
    priorMessages,
    safety: null,
    reply: '',
    model: input.modelName,
    promptTokens: null,
    completionTokens: null,
  });

  const safety = finalState.safety ?? classifyUserMessage(input.userMessage);
  return {
    reply: finalState.reply || safety.reply || '',
    safety,
    model: finalState.model || input.modelName,
    promptTokens: finalState.promptTokens,
    completionTokens: finalState.completionTokens,
    latencyMs: Date.now() - started,
  };
}
