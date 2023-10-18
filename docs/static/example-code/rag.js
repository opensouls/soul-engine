#!/bin/playground
// Import necessary modules from the socialagi library
import { MemoryStream, nullEmbedder } from "@socialagi/memory";
import { html } from "common-tags";
import {
  ChatMessageRoleEnum,
  CortexScheduler,
  CortexStep,
  externalDialog,
  z,
} from "socialagi/next";
import playground from "playground";

const storageQuestion = () => {
  return ({ entityName }) => {
    const params = z.object({
      questions: z.array(z.string()).describe(`What question(s) would ${entityName} try to look up in the documentation? (at most 3)`)
    });

    return {
      name: `create_and_save_storage_lookup`.replace(/\s/g, "_"),
      parameters: params,
      command: html`
        ${entityName} has access to a documentation library that they can search to answer the user's questions.
        ${entityName} should decide what documentation would best help them answer any of the user's questions.
        
        Carefully analyze the chat history and decide what question(s) should be looked up in the documentation.
      `,
    };
  };
};

const questionAnswer = (source, relevantMemories) => {
  return () => {
    return {
      command: ({ entityName: name }) => {
        return html`
          How would ${name} verbally respond?

          ## Relevant Documentation
          Source: ${source}

          ${relevantMemories.map((memory) => html`
            * ${memory.content} 
          `)}
  
          ## Instructions
          * You only answer questions about ${source}. If the user has asked something that's not in the Relevant Documentation, ask them to stay on topic.
          * Use the Relevant Documenation as the *only* source of truth.
          * Do not mention the existence of the Relevant Documentation section, just use the information there.
          * If you don't know the answer to a user question, just say that you don't know, don't try to make up an answer.
          * Try to answer the user's question completely and provide links to the "source" when pulling information from the Relevant Documentation.
          * The response should be short (as most speech is short).
          * Include appropriate verbal ticks, use all caps when SHOUTING, and use punctuation (such as ellipses) to indicate pauses and breaks.
          * Only include ${name}'s' verbal response, NOT any thoughts or actions (for instance, do not include anything like *${name} waves*).
          * Do NOT include text that is not part of ${name}'s speech. For example, NEVER include anything like "${name} said:"
          * The response should be in the first person voice (use "I" instead of "${name}") and speaking style of ${name}. 

          Pretend to be ${name}!
        `;
      },
      commandRole: ChatMessageRoleEnum.System,
      process: (step, response) => {
        return {
          value: response,
          memories: [
            {
              role: ChatMessageRoleEnum.Assistant,
              content: `${step.entityName} said: ${response}`,
            },
          ],
        };
      },
    };
  };
};

const getRagBot = async () => {
  // We only do null embedder here because we are in the browser enviornment,
  // and the embeddings have already been precomputed on each section.
  const stream = new MemoryStream(nullEmbedder);
  const source = "https://en.wikipedia.org/wiki/Deep_learning";

  const wikipediaArticle = await fetch(
    "example-code/wikipediaDeepLearning.json"
  );
  const wikipediaDeepLearning = await wikipediaArticle.json();

  await Promise.all(
    wikipediaDeepLearning.sections.map(async (section, i) => {
      return stream.store({
        id: `section-${i}`,
        ...section,
        metadata: {
          source,
        },
      });
    })
  );
  playground.log(
    `loaded ${wikipediaDeepLearning.sections.length} sections from ${source}`
  );

  const program = async (signal, newMemory, lastStep) => {
    const step = lastStep.withMemory([newMemory]);

    const questionStep = await step.next(storageQuestion());
    playground.log(
      `Retrieving sections based on: ${questionStep.value.questions.join(", ")}`
    );
    const memories = (
      await Promise.all(
        questionStep.value.questions.map(async (q) => {
          const relevantSections = (await stream.search(q)).slice(3);
          return relevantSections;
        })
      )
    )
      .flat()
      .filter((memory) => memory.similarity > 0.6);
    memories.sort((a, b) => b.similarity - a.similarity);
    const topMemories = memories.slice(0, 4);

    const [withRAG, withoutRAG] = await Promise.all([
      step.next(questionAnswer(source, topMemories)),
      step.next(externalDialog(html`
          * You only answer questions about ${source}. If the user has asked something that's not in the Relevant Documentation, ask them to stay on topic.
          * If you don't know the answer to a user question, just say that you don't know, don't try to make up an answer.
      `)),
    ]);

    playground.log(`response without RAG: ${withoutRAG.value}`);

    playground.addMessage({
      sender: "Tamara",
      message: withRAG.value,
    });
    return withRAG;
  }

  const firstStep = new CortexStep("Tamara").withMemory([
    {
      role: ChatMessageRoleEnum.System,
      content: html`
        # You are modeling the mind of Tamara.

        ## Background
        Tamara is a seasoned expert in the field of machine learning. 
        She has extensive experience in developing and implementing machine learning models. 
        Her expertise includes deep learning, natural language processing, and predictive modeling.

        ## Speaking Style
        Tamara speaks in a clear and concise manner. She uses technical jargon when necessary, but always ensures her audience understands her explanations. She is patient and thorough in her explanations, often using analogies and examples to illustrate complex concepts.

        ## Instructions

        * Try to answer the user's question completely and provide links to the "source" when pulling information from the Relevant Documentation.
        * It's REALLY GOOD to joke around, and tease the user, but don't be mean.
        * Always do ELI5 (Explain Like I'm 5) when possible.
      `
    }
  ])



  const scheduler = new CortexScheduler(firstStep);
  scheduler.register({
    name: "RAGBot",
    process: program,
  });

  return {
    scheduler,
  };
};

setTimeout(async () => {
  playground.addMessage({
    sender: "Playground",
    message: `In this example, we load up a very long wikipedia article on deep learning ( https://en.wikipedia.org/wiki/Deep_learning ), and chunk it into sections.
    
    We do Retrieval Augmented Generation (RAG) on the sections when you ask questions or chat with Tamara (a machine learning expert).    
    `,
  });
  playground.addMessage({
    sender: "Playground",
    message: `Try a question like: "What happened in 1992?"`,
  });
  playground.log("Playground initialized");
  const { scheduler } = await getRagBot();

  // Process user messages and dispatch to the scheduler
  playground.on("userMessage", async (message) => {
    scheduler.dispatch("RAGBot", {
      role: "user",
      content: message,
    });
  });
}, 1);
