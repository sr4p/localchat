import { AppDataSource } from './data-source'
import { Conversation, Message, MessageEmbedding } from './entities'

export const ConversationRepository = AppDataSource.getRepository(Conversation)
export const MessageRepository = AppDataSource.getRepository(Message)
export const MessageEmbeddingRepository =
  AppDataSource.getRepository(MessageEmbedding)
