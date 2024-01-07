import { Span, Tracer } from "@opentelemetry/api"

export const withErrorCatchingSpan = (tracer: Tracer, spanName: string, fn: (span: Span) => any) => {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      return await fn(span)
    } catch (err: any) {
      span.recordException(err);
      console.error('error in execute', err);
      throw err;
    } finally {
      span.end();
    }
  })
}