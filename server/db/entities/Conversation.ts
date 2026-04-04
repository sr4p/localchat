import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import type { Message } from './Message'

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text', default: 'Untitled Conversation' })
  title!: string

  @OneToMany('Message', 'conversation', {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages!: Message[]

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date
}
