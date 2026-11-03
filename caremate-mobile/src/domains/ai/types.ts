export type AiConversation = {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  retention_state: string;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | string;
  content: string;
  status: 'pending' | 'complete' | 'failed' | 'refused' | string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  safety_state: string;
  created_at: string;
  client_request_id?: string | null;
  parent_message_id?: string | null;
};

export type AiConversationDetail = {
  conversation: AiConversation;
  messages: AiMessage[];
};

export type AiPostMessageResult = {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
};
