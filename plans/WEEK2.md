# SocialAGI entrypoints

At this point, we have 4 different abstractions

1. `socialagi` library for creating entities
1. `socialagi-server` a node server with endpoints for serving social agi entities
1. `socialagi-generator` cli utility for creating a simple project that has a `socialagi-server` 
1. `socialagi-devtools` a dev dependency which runs a next.js app which connects to a `socialagi-server`

These entrypoints address the following needs
1. I want to use the socialagi lib somewhere else
1. I want to develop on the socialagi lib while chatting with an entity
1. I want to create a server with the socialagi lib that runs locally
1. I want to chat with my socialagi while developing its server

The next set of major missing needs are the following
1. I want to deploy my socialagi server
1. I want to copy someone else's socialagi server
1. I want my socialagi server to have easily modifiable blocks for other people

A socialagi server is:
- a private or public resource (for now)
- public/private code (public resource requires public code)
- takes in session ids
- takes in user ids
- unique entity name
- has a set of dynamic fields (e.g. characterTraits) 
- has an openai key associated with it

Any accessible served entity can be accessed via `api.souls.chat/EntityName` with a developer's api key

Socialagi servers define classes of entities that can be created:
- one server hosts many different entities

There's a magic deployment command which pushes a socialagi server to `souls.chat`, default is private resource, public code

Allow for custom domain mapping to `souls.chat/EntityName`

Entities are at `souls.chat/EntityName`, and are unique

Servers are at `servers.souls.chat`

Each webapp entity page has some usage stats, and points to server origin

Webapp lets users add an openai key to use private resource, public code variants

Entities can be forked directly (with fork stats), also points to their parent