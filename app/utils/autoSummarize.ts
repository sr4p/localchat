/**
 * Generate a concise conversation title from the first user message.
 * Used when autoSummarize setting is enabled.
 */
export function generateTitleFromMessage(content: string): string {
  // Strip code blocks: ```code```
  let cleaned = content.replace(/```[\s\S]*?```/g, '');
  // Strip inline code
  cleaned = cleaned.replace(/`[^`]*`/g, '');
  // Strip URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  // Strip markdown links
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip LaTeX
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, '');
  cleaned = cleaned.replace(/\$[^$]+\$/g, '');

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Truncate to 50 chars, break at word boundary
  if (cleaned.length <= 50) return cleaned;
  const truncated = cleaned.slice(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  return cleaned.slice(0, lastSpace > 10 ? lastSpace : 50);
}
