export interface BucketMetadata {
  name: string,
  organizationId: string,
  blueprintId?: string,
}

export interface RecordEntry {
  key: string,
  contentHash: string, // Buffer?
}

export type BucketEntries  = Record<string, RecordEntry>

export interface Manifest {
  bucket: BucketMetadata
  entries: BucketEntries
}
