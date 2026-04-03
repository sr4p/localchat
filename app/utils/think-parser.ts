/**
 * Incremental streaming parser for <think>...</think> reasoning tags.
 *
 * Tokens are pushed one-by-one as they arrive from the streamer.
 * The parser tracks whether we are currently inside a `<think>` block
 * and emits deltas accordingly.
 */

export interface ThinkDelta {
  type: "reasoning" | "content";
  textDelta: string;
}

export class ThinkStreamParser {
  /** Accumulated reasoning text (inside <think>…</think>). */
  reasoning = "";
  /** Accumulated content text (outside think tags). */
  content = "";

  /** Whether we are currently inside a <think> block. */
  private _inThink = false;
  /** Buffer for detecting partial opening/closing tags at chunk boundaries. */
  private _buf = "";

  private static readonly OPEN_TAG = "<think>";
  private static readonly CLOSE_TAG = "</think>";

  reset(): void {
    this.reasoning = "";
    this.content = "";
    this._inThink = false;
    this._buf = "";
  }

  /**
   * Push a chunk of text (one or more tokens) and return an array of deltas.
   * Most calls will return a single delta; the array handles the rare case
   * where a chunk contains a full tag transition.
   */
  push(text: string): ThinkDelta[] {
    const deltas: ThinkDelta[] = [];
    this._buf += text;

    while (this._buf.length > 0) {
      if (this._inThink) {
        const closeIdx = this._buf.indexOf(ThinkStreamParser.CLOSE_TAG);
        if (closeIdx !== -1) {
          const before = this._buf.slice(0, closeIdx);
          if (before) {
            this.reasoning += before;
            deltas.push({ type: "reasoning", textDelta: before });
          }
          this._buf = this._buf.slice(
            closeIdx + ThinkStreamParser.CLOSE_TAG.length,
          );
          this._inThink = false;
          continue;
        }

        // No close tag yet — hold back any tail that could be a partial tag.
        const safeLen = this._safeFlushLength(
          this._buf,
          ThinkStreamParser.CLOSE_TAG,
        );
        if (safeLen > 0) {
          const chunk = this._buf.slice(0, safeLen);
          this.reasoning += chunk;
          deltas.push({ type: "reasoning", textDelta: chunk });
          this._buf = this._buf.slice(safeLen);
        }
        break;
      } else {
        const openIdx = this._buf.indexOf(ThinkStreamParser.OPEN_TAG);
        if (openIdx !== -1) {
          const before = this._buf.slice(0, openIdx);
          if (before) {
            this.content += before;
            deltas.push({ type: "content", textDelta: before });
          }
          this._buf = this._buf.slice(
            openIdx + ThinkStreamParser.OPEN_TAG.length,
          );
          this._inThink = true;
          continue;
        }

        // No open tag yet — hold back any tail that could be a partial tag.
        const safeLen = this._safeFlushLength(
          this._buf,
          ThinkStreamParser.OPEN_TAG,
        );
        if (safeLen > 0) {
          const chunk = this._buf.slice(0, safeLen);
          this.content += chunk;
          deltas.push({ type: "content", textDelta: chunk });
          this._buf = this._buf.slice(safeLen);
        }
        break;
      }
    }

    return deltas;
  }

  /**
   * Flush any remaining buffered text. Call this when generation is complete
   * to ensure no text is left in the partial-tag buffer.
   */
  flush(): ThinkDelta[] {
    if (!this._buf) return [];
    const deltas: ThinkDelta[] = [];
    if (this._inThink) {
      this.reasoning += this._buf;
      deltas.push({ type: "reasoning", textDelta: this._buf });
    } else {
      this.content += this._buf;
      deltas.push({ type: "content", textDelta: this._buf });
    }
    this._buf = "";
    return deltas;
  }

  /**
   * How many characters from the start of `buf` can be safely emitted
   * without risking cutting a partial `tag` at the end.
   */
  private _safeFlushLength(buf: string, tag: string): number {
    // Check if the tail of buf could be the start of the tag
    for (let overlap = Math.min(buf.length, tag.length - 1); overlap > 0; overlap--) {
      if (buf.endsWith(tag.slice(0, overlap))) {
        return buf.length - overlap;
      }
    }
    return buf.length;
  }
}
