import { Processor, ProcessorCreationOpts, ProcessorFactory } from './Processor.js'

const processorRegistry: Record<string, ProcessorFactory > = {}

export function registerProcessor(name: string, processor: ProcessorFactory) {
  if (processorRegistry[name]) {
    throw new Error(`Processor with name ${name} already exists`)
  }
  processorRegistry[name] = processor
}

export function getProcessor(name: string, opts?: ProcessorCreationOpts): Processor {
  if (!processorRegistry[name]) {
    throw new Error(`Processor with name ${name} does not exist`)
  }
  return processorRegistry[name](opts)
}
