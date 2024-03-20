export class ReusableStream<T> {
  private buffer: (T|null)[] = [];
  private iterable: AsyncIterable<T>;
  private resolvers:(() => void)[]
  private firstPacketReceived = false
  private onFirstHandler?: () => void

  constructor(iterable: AsyncIterable<T>) {
    this.iterable = iterable;
    this.resolvers = []
    this.go()
  }

  private async go() {
    for await (const item of this.iterable) {
      this.buffer.push(item);
      this.resolveAll()
      if (!this.firstPacketReceived && this.onFirstHandler) {
        this.onFirstHandler()
      }
      this.firstPacketReceived = true
    }
    this.buffer.push(null);
    this.resolveAll()
  }

  private resolveAll() {
    this.resolvers.forEach(resolve => resolve())
    this.resolvers = []
  }

  onFirst(handler: () => void) {
    this.onFirstHandler = handler;
    if (this.firstPacketReceived) {
      handler()
    }
  }

  async *stream() {
    let i = 0
    while (true) {
      if (i < this.buffer.length) {
        const val = this.buffer[i]
        if (val === null) {
          return
        }
        yield val
        i++
      } else {
        await new Promise<void>((resolve) => {
          this.resolvers.push(resolve)
        })
      }
    }
  }
}
