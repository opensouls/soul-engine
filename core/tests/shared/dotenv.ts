import { SpanProcessorType, startInstrumentation } from '../../src/next/instrumentation';
import dotenv from 'dotenv';
dotenv.config();
startInstrumentation({
  spanProcessorType: SpanProcessorType.Simple,
})
