import 'reflect-metadata';
import '@server/db/pgvector-patch';
import { beforeAll, afterEach, afterAll, describe, expect, test } from 'bun:test';
import { setupTestDb, teardownTestDb, truncateAll } from './setup';
import {
  ConversationRepository,
  MessageRepository,
  MessageEmbeddingRepository,
} from '../server/db/repositories';

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('Conversation', () => {
  test('creates conversation with UUID', async () => {
    const conv = ConversationRepository.create({ title: 'Test Chat' });
    const saved = await ConversationRepository.save(conv);

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('Test Chat');
  });

  test('finds conversation by ID', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Find Test' }),
    );

    const found = await ConversationRepository.findOneBy({ id: conv.id });
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Find Test');
  });

  test('updates conversation', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Original' }),
    );

    conv.title = 'Updated';
    await ConversationRepository.save(conv);

    const updated = await ConversationRepository.findOneBy({ id: conv.id });
    expect(updated?.title).toBe('Updated');
  });

  test('deletes conversation', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Delete Test' }),
    );

    await ConversationRepository.remove(conv);
    const deleted = await ConversationRepository.findOneBy({ id: conv.id });
    expect(deleted).toBeNull();
  });

  test('sets default title', async () => {
    const conv = await ConversationRepository.save(ConversationRepository.create({}));
    expect(conv.title).toBe('Untitled Conversation');
  });

  test('count returns at least 1', async () => {
    await ConversationRepository.save(ConversationRepository.create({ title: 'Count Test' }));
    const count = await ConversationRepository.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe('Message', () => {
  test('creates message with UUID', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Msg Test' }),
    );

    const msg = MessageRepository.create({
      conversationId: conv.id,
      role: 'user',
      content: 'Hello',
    });
    const saved = await MessageRepository.save(msg);

    expect(saved.id).toBeDefined();
    expect(saved.role).toBe('user');
    expect(saved.content).toBe('Hello');
  });

  test('finds message by ID', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Find Msg' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Find me' }),
    );

    const found = await MessageRepository.findOneBy({ id: msg.id });
    expect(found).not.toBeNull();
    expect(found?.content).toBe('Find me');
  });

  test('updates message', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Update Msg' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Old' }),
    );

    msg.content = 'New';
    await MessageRepository.save(msg);

    const updated = await MessageRepository.findOneBy({ id: msg.id });
    expect(updated?.content).toBe('New');
  });

  test('deletes message', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Delete Msg' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Delete me' }),
    );

    await MessageRepository.remove(msg);
    const deleted = await MessageRepository.findOneBy({ id: msg.id });
    expect(deleted).toBeNull();

    await ConversationRepository.remove(conv);
  });

  test('stores optional fields', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Optional Msg' }),
    );

    const msg = await MessageRepository.save(
      MessageRepository.create({
        conversationId: conv.id,
        role: 'assistant',
        content: 'Reasoned response',
        reasoning: 'Thinking process...',
        durationSec: 1.5,
        tokenCount: 100,
      }),
    );

    const found = await MessageRepository.findOneBy({ id: msg.id });
    expect(found?.reasoning).toBe('Thinking process...');
    expect(found?.durationSec).not.toBeNull();
    expect(found?.tokenCount).toBe(100);
  });

  test('null optional fields by default', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Simple Msg' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Simple' }),
    );

    const found = await MessageRepository.findOneBy({ id: msg.id });
    expect(found?.reasoning).toBeNull();
    expect(found?.durationSec).toBeNull();
    expect(found?.tokenCount).toBeNull();

    await MessageRepository.remove(msg);
    await ConversationRepository.remove(conv);
  });
});

describe('Message Relationships', () => {
  test('loads messages relation from conversation', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Rel Test' }),
    );

    await MessageRepository.save([
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Hi' }),
      MessageRepository.create({ conversationId: conv.id, role: 'assistant', content: 'Hello' }),
    ]);

    const withMessages = await ConversationRepository.findOne({
      where: { id: conv.id },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });

    expect(withMessages?.messages).toHaveLength(2);
    expect(withMessages?.messages[0].role).toBe('user');
    expect(withMessages?.messages[1].role).toBe('assistant');

    await MessageRepository.delete({ conversationId: conv.id });
    await ConversationRepository.remove(conv);
  });

  test('loads conversation relation from message', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Rel Conv' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Test' }),
    );

    const withConv = await MessageRepository.findOne({
      where: { id: msg.id },
      relations: { conversation: true },
    });

    expect(withConv?.conversation.title).toBe('Rel Conv');

    await MessageRepository.remove(msg);
    await ConversationRepository.remove(conv);
  });
});

describe('Cascade Delete', () => {
  test('deletes messages when conversation is removed', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Cascade Test' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Test' }),
    );

    const msgCount = await MessageRepository.countBy({ conversationId: conv.id });
    expect(msgCount).toBe(1);

    await ConversationRepository.remove(conv);

    const msgAfter = await MessageRepository.findOneBy({ id: msg.id });
    expect(msgAfter).toBeNull();
  });
});

describe('MessageEmbedding', () => {
  test('creates embedding with 384-dimension vector', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Emb Test' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'assistant', content: 'Response' }),
    );

    const embedding = new Array(384).fill(0).map((_, i) => i * 0.001);
    const emb = MessageEmbeddingRepository.create({ messageId: msg.id, embedding });
    const saved = await MessageEmbeddingRepository.save(emb);

    expect(saved.id).toBeDefined();
    expect(saved.embedding).toHaveLength(384);

    await MessageEmbeddingRepository.remove(saved);
    await MessageRepository.remove(msg);
    await ConversationRepository.remove(conv);
  });

  test('finds embedding by ID', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Find Emb' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'assistant', content: 'Response' }),
    );

    const embedding = new Array(384).fill(0.5);
    const emb = await MessageEmbeddingRepository.save(
      MessageEmbeddingRepository.create({ messageId: msg.id, embedding }),
    );

    const found = await MessageEmbeddingRepository.findOneBy({ id: emb.id });
    expect(found).not.toBeNull();
    expect(found?.embedding).toHaveLength(384);

    await MessageEmbeddingRepository.remove(emb);
    await MessageRepository.remove(msg);
    await ConversationRepository.remove(conv);
  });

  test('deletes embedding', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Delete Emb' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'assistant', content: 'Response' }),
    );

    const embedding = new Array(384).fill(0.1);
    const emb = await MessageEmbeddingRepository.save(
      MessageEmbeddingRepository.create({ messageId: msg.id, embedding }),
    );

    await MessageEmbeddingRepository.remove(emb);
    const deleted = await MessageEmbeddingRepository.findOneBy({ id: emb.id });
    expect(deleted).toBeNull();

    await MessageRepository.remove(msg);
    await ConversationRepository.remove(conv);
  });

  test('loads embeddings relation from message', async () => {
    const conv = await ConversationRepository.save(
      ConversationRepository.create({ title: 'Emb Rel Test' }),
    );
    const msg = await MessageRepository.save(
      MessageRepository.create({ conversationId: conv.id, role: 'user', content: 'Query' }),
    );

    const embedding = new Array(384).fill(0.5);
    await MessageEmbeddingRepository.save(
      MessageEmbeddingRepository.create({ messageId: msg.id, embedding }),
    );

    const withEmb = await MessageRepository.findOne({
      where: { id: msg.id },
      relations: { embeddings: true },
    });

    expect(withEmb?.embeddings).toHaveLength(1);

    await MessageEmbeddingRepository.delete({ messageId: msg.id });
    await MessageRepository.remove(msg);
    await ConversationRepository.remove(conv);
  });
});
