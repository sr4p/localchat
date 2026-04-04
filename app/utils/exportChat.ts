import type { ChatMessage } from '../hooks/LLMContext';

interface ExportConversationOptions {
  conversationId: string;
  title: string;
  messages: ChatMessage[];
  format: 'json' | 'markdown';
}

/** Export a conversation as JSON or Markdown and trigger a download. */
export function exportConversation({
  conversationId,
  title,
  messages,
  format,
}: ExportConversationOptions): void {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chat';
  const filename = `${slug}.${format === 'json' ? 'json' : 'md'}`;

  const content = format === 'json'
    ? toJson(conversationId, title, messages)
    : toMarkdown(title, messages);

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toJson(
  conversationId: string,
  title: string,
  messages: ChatMessage[],
): string {
  const data = {
    conversationId,
    title,
    exportedAt: new Date().toISOString(),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.reasoning ? { reasoning: m.reasoning } : {}),
      ...(m.responseMeta ? { durationSec: m.responseMeta.durationSec, tokenCount: m.responseMeta.tokenCount } : {}),
      ...(m.modelName ? { modelName: m.modelName } : {}),
    })),
  };
  return JSON.stringify(data, null, 2);
}

function toMarkdown(title: string, messages: ChatMessage[]): string {
  const lines: string[] = [`# ${title}`, ''];
  for (const msg of messages) {
    const header = msg.role === 'user' ? '## User' : '## Assistant';
    lines.push(header, '');
    if (msg.reasoning) {
      lines.push('<details><summary>Reasoning</summary>', '', msg.reasoning, '', '</details>', '');
    }
    lines.push(msg.content, '');
  }
  return lines.join('\n');
}
