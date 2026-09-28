export interface SuggestedQuestion {
  id: string;
  question: string;
}

export interface ChatOption {
  label: string;
  value: string;
}

export type ChatSender = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: string;
  options?: ChatOption[];
}
