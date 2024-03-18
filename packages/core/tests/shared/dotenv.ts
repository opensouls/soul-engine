import "dotenv/config"
import { SpanProcessorType, startInstrumentation } from './instrumentation.js';

startInstrumentation({
  spanProcessorType: SpanProcessorType.Simple,
})
