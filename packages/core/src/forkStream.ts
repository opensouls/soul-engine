import { ReadableStream } from 'web-streams-polyfill';

export function forkStream<T>(originalStream: AsyncIterable<T>, count = 2): ReadableStream<T>[] {
  const streams = Array.from({ length: count }, () => {
    let controller: { current: ReadableStreamDefaultController<T> | null } = { current: null };

    const stream = new ReadableStream<T>({
      start(c) {
        controller.current = c;
      },
      cancel() {
        console.log('Stream was cancelled.');
      }
    });

    return {
      stream,
      controller
    };
  });

  const processStream = async () => {
    try {
      for await (const chunk of originalStream) {
        streams.forEach(({ stream, controller }) => {
          if (controller.current) {
            controller.current.enqueue(chunk);
          }
        });
      }
      streams.forEach(({ stream, controller }) => {
        if (controller.current) {
          controller.current.close();
        }
      });
    } catch (err) {
      console.error('Error processing stream:', err);
      streams.forEach(({ stream, controller }) => {
        if (controller.current) {
          controller.current.error(err);
        }
      });
    }
  };

  processStream();

  return streams.map(({ stream }) => stream);
}