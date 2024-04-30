import { Readable } from 'node:stream';

export function forkStream<T>(originalStream: AsyncIterable<T>, count = 2, objectMode = false): Readable[] {

  const streams = Array(count).fill(true).map(() => new Readable({
    objectMode,
    read() { },
    destroy(err, callback) {
      if (err) {
        console.error('Stream 1 encountered an error:', err);
      }
      callback(null);
    }
  }));

  const processStream = async () => {
    try {
      for await (const chunk of originalStream) {
        for (const stream of streams) {
          if (!stream.push(chunk)) {
            // Handle backpressure by pausing the source stream if needed
            await new Promise(resolve => setImmediate(resolve));
          }
        }
      }
      for (const stream of streams) {
        stream.push(null);
      }
    } catch (err: any) {
      for (const stream of streams) {
        stream.push(null);
      }
    }
  };

  processStream();

  return streams;
}
