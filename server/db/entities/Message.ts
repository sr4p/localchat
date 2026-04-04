import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { ColumnType } from 'typeorm'
import type { Conversation } from './Conversation'

@Entity('messages')
@Index(['conversationId'])
@Index(['parentId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne('Conversation', 'messages', {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string

  @Column({ type: 'text' })
  role!: 'user' | 'assistant' | 'system'

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'text', nullable: true })
  reasoning!: string | null

  @Column({ name: 'duration_sec', type: 'numeric', nullable: true })
  durationSec!: number | null

  @Column({ name: 'token_count', type: 'int', nullable: true })
  tokenCount!: number | null

  @Column({ name: 'model_name', type: 'text', nullable: true })
  modelName!: string | null

  @Column({ name: 'model_type', type: 'text', nullable: true })
  modelType!: 'local' | 'api' | null

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null

  @OneToMany('MessageEmbedding', 'message', {
    cascade: true,
  })
  embeddings!: MessageEmbedding[]

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}

@Entity('message_embeddings')
@Index(['messageId'])
@Unique(['messageId'])
export class MessageEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne('Message', 'embeddings', {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'message_id' })
  message!: Message

  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string

  @Column({ type: 'vector' as ColumnType, nullable: true })
  embedding!: number[] | null

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}
