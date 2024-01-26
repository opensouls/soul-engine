
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'OpenSoulsMemory',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.1',
  }),
  traceExporter: new OTLPTraceExporter({
    // optional - default url is http://localhost:4318/v1/traces
    // url: 'http://localhost:4318/v1/traces',
    // optional - collection of custom headers to be sent with each request, empty by default
    // headers: {},
  }),
});

sdk.start();
console.log("started instrumentation!")
