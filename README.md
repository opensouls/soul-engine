# 🤖+👱 OPEN SOULS (Engine SDK)

[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/OpenSoulsPBC.svg?style=social&label=Follow%20%40OpenSoulsPBC)](https://twitter.com/OpenSoulsPBC) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/opensouls)

## 🤔 What is this?

> The Soul Engine is currently in closed Beta! [Join our mailing list](https://opensouls.beehiiv.com/subscribe) to be the first to hear about the next updates!

Soul Engine provides developers clean, simple, and extensible abstractions for directing the cognitive processes of large language models (LLMs), steamlining the creation of more effective and engaging AI souls.

This repo contains the SDK for the Soul Engine.

## 💫 AI Souls

AI Souls are agentic and embodied digital beings, one day comprising thousands of mental processes (managed by the Soul Engine). Unlike traditional chatbots, this code will give digital souls personality, drive, ego, and will.

## 📖 Repo structure

- [`/packages/engine`](./packages/engine) contains the client side code for building and interacting with the Soul Engine.

## 🚢 Releasing

(Releasing is only applicable to the OPEN SOULS team).

To release a new version, please follow these steps:

1. Ensure you have the necessary access permissions.
1. Run `git checkout -b bump/v0.1.XX` (where `XX` is the new version)
1. Push the new branch to the origin: `git push origin bump/v0.1.XX`
1. Run the bump script: `npm run bump`
1. Wait until GitHub Actions releases the package.
1. Don't forget to merge your bump branch to main
