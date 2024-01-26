---
id: intro
sidebar_position: 1
---

# Memory And Embeddings

`@socialagi/memory` provides a simple way to store and retrieve memories based on a relevancy score. The relevancy score was influenced by the [Stanford Simulation paper](https://arxiv.org/abs/2304.03442) and scores recency, importance, and relevance (based on vector similarity) of a memory when ranking.

This library is a work in progress and currently only supports non-persistent, in-memory storage.


```bash
npm install @socialagi/memory
```

## MemoryStream

The `MemoryStream` class is used to store and retrieve memories. Here's a basic example of how to use it:

```typescript
import { MemoryStream } from "@socialagi/memory"

// Create a new instance of MemoryStream
const memoryStream = new MemoryStream()

// Store a memory
await memoryStream.store({
  id: "hi",
  content: "Hello, world!"
})

// Retrieve a memory
const memory = await memoryStream.get("hi")

// Search for memories relevant to a text
const returnedMemories = await memoryStream.search("hi said the canine")
```

Memories are saved using the `Memory` interface.
* id: A unique identifier for the memory.
* content: The content of the memory.
* embedding: a vector returned from an embedding function
* createdAt: The date and time when the memory was created.
* updatedAt: The date and time when the memory was last updated.
* metadata: A record of any additional data associated with the memory.

Only context is required.

```typescript
const memory: Memory = {
  id: "unique-id",
  content: "This is a memory.",
  embedding: [0.1, 0.2, 0.3, 0.4],
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    author: "John Doe",
    location: "New York"
  }
}
``` 

## Embeddings

Embeddings are a way to represent text data in a numerical format that can be processed by machine learning algorithms. In `@socialagi/memory`, we use the Embedder interface and its various implementations to create these embeddings.

Here's an example of how to use the default embedder:

```typescript
import { getDefaultEmbedder } from "@socialagi/memory"

// Get the default embedder
const embedder = getDefaultEmbedder()

// Create an embedding
const embedding = await embedder.createEmbedding("Hello, world!")
```

The Embedder interface has a single method, createEmbedding(content: string), which takes a string and returns a Promise that resolves to an Embedding, which is an array of numbers.

We have two implementations of Embedder.

The defaultEmbeddder is a `HuggingFaceEmbedder` using the "Supabase/gte-small" model (which performs better )

1. HuggingFaceEmbedder: This uses the Hugging Face Transformers library to create embeddings. It uses a model specified at instantiation (default is "Supabase/gte-small") and creates embeddings asynchronously.

```typescript
import { HuggingFaceEmbedder } from "@socialagi/memory"

// Create a new instance of HuggingFaceEmbedder
const embedder = new HuggingFaceEmbedder()

// Create an embedding
const embedding = await embedder.createEmbedding("Hello, world!")
```

2. nullEmbedder: This is a simple implementation that always returns an empty array. It's useful when you only want to store and retrieve recent memories, and don't need to search for memories.

```typescript
import { nullEmbedder } from "@socialagi/memory"


const stream = new MemoryStream(nullEmbedder)

```
