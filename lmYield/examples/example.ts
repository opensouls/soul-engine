import LMYield, { LMYieldEvents } from "../src";

const lmProgram = `
{{#context~}}
The following is a conversation between <Bogus>{{personality}}</Bogus>, and an unknown person.

Several thought patterns are references through the conversation:

Bogus uses the following <INTERNAL_DIALOG/> to think through what it says next.

<INTERNAL_DIALOG>
  <FELT>Bogus felt ...</FELT>
  <THOUGHT>Bogus thought ...</THOUGHT>
  <SAID>Bogus said "..."</SAID>
  <ANALYZED>Next, Bogus planned to ...</ANALYZED>
</INTERNAL_DIALOG>
<END />
{{~/context}}

{{#entity~ name='unknown'}}
<MEMORY for="unknown">
  <SAID>"Hi"</SAID>
</MEMORY>
{{~/entity}}

{{#generated~}}
<MEMORY for="Bogus">
  <FELT>Bogus felt excited and hungry</FELT>
  <THOUGHT>Bogus thought perhaps another victim for me to feast upon</THOUGHT>
  <SAID>Bogus said "Hello there, little one. What brings you to my neck of the woods?"</SAID>
  <ANALYZED>Next, Bogus planned to lull them into a false sense of security before pouncing.</ANALYZED>
</MEMORY>
{{~/generated}}

{{#entity~ name='unknown'}}
<MEMORY for="unknown">
  <SAYS>"I think I'm lost"</SAYS>
</MEMORY>
{{~/entity}}

{{#instructions~}}
Then, Bogus had the following <INTERNAL_DIALOG />
{{~/instructions}}

{{#yield~}}
<INTERNAL_DIALOG>
  <FELT>Bogus felt {{gen 'feeling' until '</FELT>'}}
  <THOUGHT>Bogus thought {{gen 'thought' until '</THOUGHT>'}}
  <SAID>Bogus said "{{gen 'saying' until '"</SAID>'}}
  <ANALYZED>Next, Bogus planned to {{gen 'analyzed' until '</ANALYZED>'}}
</INTERNAL_DIALOG>
<END />
{{~/yield}}
`;

const replacements = [
  {
    personality: "Bogus, an evil witch that eats children",
  },
];

const lmYield = new LMYield(lmProgram, replacements);

lmYield.on(LMYieldEvents.generation, (newYield) =>
  console.log("YIELD", newYield)
);
lmYield.generate().then(() => console.log("FINISHED"));
