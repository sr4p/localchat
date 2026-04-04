import { AppDataSource } from './data-source';
import { Conversation, Message, MessageEmbedding } from './entities';
import type { Repository } from 'typeorm';

export function getConversationRepository() {
  return AppDataSource.getRepository(Conversation);
}

export function getMessageRepository() {
  return AppDataSource.getRepository(Message);
}

export function getMessageEmbeddingRepository() {
  return AppDataSource.getRepository(MessageEmbedding);
}

// Lazy-loaded getters for legacy compatibility.
// Each access calls the getter so the DataSource must be initialized first.

let _conversationRepo: Repository<Conversation> | null = null;
let _messageRepo: Repository<Message> | null = null;
let _messageEmbeddingRepo: Repository<MessageEmbedding> | null = null;

export function getConversationRepo(): Repository<Conversation> {
  _conversationRepo ??= AppDataSource.getRepository(Conversation);
  return _conversationRepo;
}

export const ConversationRepository = new Proxy({} as Repository<Conversation>, {
  get: (_, prop) => getConversationRepo()[prop as keyof Repository<Conversation>],
});

export function getMessageRepo(): Repository<Message> {
  _messageRepo ??= AppDataSource.getRepository(Message);
  return _messageRepo;
}

export const MessageRepository = new Proxy({} as Repository<Message>, {
  get: (_, prop) => getMessageRepo()[prop as keyof Repository<Message>],
});

export function getMessageEmbeddingRepo(): Repository<MessageEmbedding> {
  _messageEmbeddingRepo ??= AppDataSource.getRepository(MessageEmbedding);
  return _messageEmbeddingRepo;
}

export const MessageEmbeddingRepository = new Proxy({} as Repository<MessageEmbedding>, {
  get: (_, prop) => getMessageEmbeddingRepo()[prop as keyof Repository<MessageEmbedding>],
});
