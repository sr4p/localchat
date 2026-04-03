import { setupTestDb, teardownTestDb, truncateAll } from './setup';
import {
  ConversationRepository,
  MessageRepository,
  MessageEmbeddingRepository,
} from '../server/db/repositories';
import { TestDataSource } from './setup';

async function runTests() {
  console.log('Setting up test database...');
  await setupTestDb();
  console.log('Test database connected successfully');

  try {
    await testConversationCrud();
    await testMessageRelationships();
    await testEmbeddingStorage();
    console.log('\nAll tests passed!');
  } finally {
    await teardownTestDb();
  }
}

async function testConversationCrud() {
  console.log('\n--- Testing Conversation CRUD ---');

  const conv = ConversationRepository.create({ title: 'Test Chat' });
  const saved = await ConversationRepository.save(conv);
  console.log(`Created conversation: ${saved.id}`);

  const found = await ConversationRepository.findOneBy({ id: saved.id });
  if (!found) throw new Error('Failed to find created conversation');
  if (found.title !== 'Test Chat') throw new Error('Title mismatch');
  console.log(`Found conversation: ${found.title}`);

  found.title = 'Updated Chat';
  await ConversationRepository.save(found);
  const updated = await ConversationRepository.findOneBy({ id: found.id });
  if (updated?.title !== 'Updated Chat') throw new Error('Update failed');
  console.log(`Updated conversation: ${updated.title}`);

  await ConversationRepository.remove(updated!);
  const deleted = await ConversationRepository.findOneBy({ id: saved.id });
  if (deleted !== null) throw new Error('Delete failed');
  console.log('Deleted conversation');
}

async function testMessageRelationships() {
  console.log('\n--- Testing Message Relationships ---');

  const conv = await ConversationRepository.save(
    ConversationRepository.create({ title: 'Messages Test' }),
  );

  const msg = MessageRepository.create({
    conversationId: conv.id,
    role: 'user',
    content: 'Hello world',
  });
  const saved = await MessageRepository.save(msg);
  console.log(`Created message: ${saved.id}`);

  const withConversation = await MessageRepository.findOne({
    where: { id: saved.id },
    relations: { conversation: true },
  });
  if (!withConversation?.conversation) throw new Error('Failed to load conversation relation');
  if (withConversation.conversation.title !== 'Messages Test')
    throw new Error('Conversation title mismatch');
  console.log(`Loaded message with conversation: ${withConversation.conversation.title}`);

  const convWithMessages = await ConversationRepository.findOne({
    where: { id: conv.id },
    relations: { messages: true },
  });
  if (!convWithMessages?.messages || convWithMessages.messages.length !== 1) {
    throw new Error('Failed to load messages relation');
  }
  console.log(`Loaded conversation with ${convWithMessages.messages.length} message(s)`);

  await MessageRepository.remove(saved);
  await ConversationRepository.remove(conv);
  console.log('Cleaned up message test data');
}

async function testEmbeddingStorage() {
  console.log('\n--- Testing Embedding Storage ---');

  const conv = await ConversationRepository.save(
    ConversationRepository.create({ title: 'Embedding Test' }),
  );
  const msg = await MessageRepository.save(
    MessageRepository.create({
      conversationId: conv.id,
      role: 'assistant',
      content: 'Test response',
    }),
  );

  const embedding = new Array(384).fill(0).map((_, i) => i * 0.01);
  const emb = MessageEmbeddingRepository.create({
    messageId: msg.id,
    embedding,
  });
  const saved = await MessageEmbeddingRepository.save(emb);
  console.log(`Created embedding: ${saved.id}`);

  const found = await MessageEmbeddingRepository.findOneBy({ id: saved.id });
  if (!found) throw new Error('Failed to find embedding');
  if (found.embedding.length !== 384) throw new Error('Embedding dimension mismatch');
  console.log(`Found embedding with ${found.embedding.length} dimensions`);

  await MessageEmbeddingRepository.remove(saved);
  await MessageRepository.remove(msg);
  await ConversationRepository.remove(conv);
  console.log('Cleaned up embedding test data');
}

runTests().catch((error) => {
  console.error('Test failed:', error.message);
  teardownTestDb().catch(() => {});
  process.exit(1);
});
