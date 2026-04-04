import { useRef, useCallback, useState } from 'react';
import type { ChatMessage } from './LLMContext';
import type React from 'react';

const MAX_DEPTH = 20;

interface Result {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushCheckpoint: () => void;
}

/**
 * Undo/Redo state machine for chat messages.
 * Stores snapshots of the messages array on checkpoint.
 * Limit stack depth to MAX_DEPTH entries.
 */
export function useChatHistory(
  messages: ChatMessage[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
): Result {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoStackRef = useRef<ChatMessage[][]>([]);
  const redoStackRef = useRef<ChatMessage[][]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const pushCheckpoint = useCallback(() => {
    const snapshot = messagesRef.current.map((m) => ({ ...m }));
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > MAX_DEPTH) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const redoStack = redoStackRef.current;
    redoStack.push(messagesRef.current.map((m) => ({ ...m })));
    if (redoStack.length > MAX_DEPTH) redoStack.shift();
    const prevMessages = undoStackRef.current.pop()!;
    messagesRef.current = prevMessages;
    setMessages(prevMessages.map((m) => ({ ...m })));
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, [setMessages]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const undoStack = undoStackRef.current;
    undoStack.push(messagesRef.current.map((m) => ({ ...m })));
    if (undoStack.length > MAX_DEPTH) undoStack.shift();
    const nextMessages = redoStackRef.current.pop()!;
    messagesRef.current = nextMessages;
    setMessages(nextMessages.map((m) => ({ ...m })));
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, [setMessages]);

  return { canUndo, canRedo, pushCheckpoint, undo, redo };
}
