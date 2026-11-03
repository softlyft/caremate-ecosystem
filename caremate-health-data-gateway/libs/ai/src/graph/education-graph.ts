import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  SYSTEM_PROMPT,
  classifyUserMessage,
  type SafetyDecision,
} from '../safety/policy';

export type EducationGraphResult = {
  reply: string;
  safety: SafetyDecision;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

const GraphState = Annotation.Root({
  userMessage: Annotation<string>,
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
  });
}

/**
 * Phase 1 LangGraph: classify → safety gate → generate (or short-circuit).
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
    const response = await model.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(state.userMessage),
    ]);
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
}): Promise<EducationGraphResult> {
  const graph = createEducationGraph(input.apiKey, input.modelName);
  const finalState = await graph.invoke({
    userMessage: input.userMessage,
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
  };
}
