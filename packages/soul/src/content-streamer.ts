
/**
 * This class handles a string that is constantly being updated, and turns it into an async iterable that streams the *new* content
 * instead of the whole string.
 */
export class ContentStreamer {
  private _onComplete: (() => void) | null = null;
  private alreadyStreamedContent = ""
  private currentContent = "";

  private finished = false

  private resolveUpdatePromise: (() => void) | null = null;

  complete() {
    this.finished = true
    if (this.resolveUpdatePromise) {
      this.resolveUpdatePromise();
      this.resolveUpdatePromise = null;
    }

    if (this._onComplete) {
      this._onComplete();
    }
  }

  onComplete(callback: () => void) {
    this._onComplete = callback;
  }

  async *stream() {
    while (!this.finished) {
      // Stream any remaining content even if finished is true
      const contentToStream = this.contentToStream();
      if (contentToStream.length > 0) {
        const message = contentToStream;
        yield message;
        this.alreadyStreamedContent += message;
      } else if (!this.finished) {
        // Only wait for new content if we are not finished
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>(resolve => { this.resolveUpdatePromise = resolve; });
      }
    }

    // If we are finished, stream the last bit of content
    const contentToStream = this.contentToStream();
    if (contentToStream.length > 0) {
      const message = contentToStream;
      yield message;
      this.alreadyStreamedContent += message;
    }

    if (this.resolveUpdatePromise) {
      this.resolveUpdatePromise();
      this.resolveUpdatePromise = null;
    }
  }

  updateContent(message: string) {
    this.currentContent = message;
    if (this.resolveUpdatePromise) {
      this.resolveUpdatePromise();
      this.resolveUpdatePromise = null;
    }
  }

  private contentToStream(): string {
    return this.currentContent.slice(this.alreadyStreamedContent.length);
  }
}
