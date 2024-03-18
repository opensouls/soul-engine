export interface Processor {
  //TODO
}
export interface ProcessorCreationOpts {
  //todo
}
export type ProcessorFactory = (opts?: ProcessorCreationOpts) => Processor
