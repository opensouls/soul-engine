---
id: actions
sidebar_position: 4
---

# Custom Actions

The CortexStep class in the SocialAGI library, meant for modelling an AI's internal monologue, provides flexibility by allowing custom actions apart from its predefined ones.

## Registering a Custom Action

Use the `registerAction` method to add a custom action to a CortexStep instance:

```javascript
step.registerAction('actionName', (spec: CustomSpec) => {
  // Custom action implementation here
  // Always return a new CortexStep instance
});
```

Here, `actionName` is a unique string identifier for your custom action, and `spec` is an object (`CustomSpec`) that defines the parameters your action needs.

For instance, you could register a custom action `ponderThought`, which accepts a thought:

```javascript
step.registerAction('ponderThought', (spec: { thought: string }) => {
  // You can use spec.thought in your custom action implementation
  // Return a new CortexStep instance
});
```

## Invoking a Custom Action

Call your custom action using the `next` method:

```javascript
let spec = { thought: "What is the nature of consciousness?" };
step = await step.next('ponderThought', spec);
```

Note: Always reassign the result of the `next` call to your `CortexStep` instance, as each step returns a new instance, consistent with functional programming principles.

## Important Points

- Registering an action with an already-existing name will throw an error.
- CortexStep aims to model an AI's internal monologue. Keeping this concept in mind when defining custom actions ensures consistency.

Through `registerAction`, you can extend CortexStep's capabilities and create a flexible cognitive model.
