
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SpanExporter, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

let started = false

export enum SpanProcessorType {
  Batch = "Batch",
  Simple = "Simple",
}

export interface InstrumentationOptions {
  url?: string
  headers?: Record<string,any>
  spanExporter?: SpanExporter
  spanProcessor?: SpanProcessor
  spanProcessorType?: SpanProcessorType
}

export const startInstrumentation = ({ url, headers, spanExporter:userExporter, spanProcessor, spanProcessorType }: InstrumentationOptions = {}) => {
  if (started) {
    return // idempotent 
  }

  const exporter = userExporter || new OTLPTraceExporter({
    // optional - default url is http://localhost:4318/v1/traces
    url: url || 'http://localhost:4318/v1/traces',
    // optional - collection of custom headers to be sent with each request, empty by default
    headers: headers || {},
  })

  let processor = spanProcessor
  if (!processor) {
    switch(spanProcessorType) {
      case SpanProcessorType.Simple:
        processor = new SimpleSpanProcessor(exporter)
        break;
      default:
        processor = new BatchSpanProcessor(exporter)
    }
  }


  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'OpenSoulsCortexStep',
      [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.10',
    }),
    traceExporter: exporter,
    spanProcessor: processor,
  });
  started = true
  sdk.start();
  console.log("instrumentation started")
}
