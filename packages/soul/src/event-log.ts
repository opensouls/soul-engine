import { syncedStore } from "@syncedstore/core"

import { eventLogShape, type EventLogDoc } from "@opensouls/core"

export const syncedEventStore = 
  (): ReturnType<typeof syncedStore<EventLogDoc>> => syncedStore<EventLogDoc>(eventLogShape)
