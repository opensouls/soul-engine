import { SpanProcessorType, startInstrumentation } from '../../src/instrumentation';
import dotenv from 'dotenv';
dotenv.config();
startInstrumentation({
  spanProcessorType: SpanProcessorType.Simple,
})
