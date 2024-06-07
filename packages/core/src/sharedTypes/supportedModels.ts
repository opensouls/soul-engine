export const SUPPORTED_MODELS = ["fast", "quality", "vision", "gpt-3.5-turbo-0125", "gpt-4-0125-preview", "gpt-4-vision-preview", "gpt-4-turbo", "gpt-4o", "exp/OpenHermes-2p5-Mistral-7B", 
"exp/Nous-Hermes-2-Mixtral-8x7B-SFT", "exp/Nous-Hermes-2-Mixtral-8x7B-DPO", "exp/claude-3-opus", "exp/claude-3-sonnet",
"exp/claude-3-haiku", "exp/nous-hermes-2-mixtral-fp8", "exp/hermes-2-pro-mistral-7b", "exp/firefunction-v1", "exp/firellava-13b",
"exp/mixtral-8x22b-instruct", "exp/llama-v3-70b-instruct"];

export type OrganizationSlug = string;
export type CustomModelName = string;
export type CUSTOM_MODEL = `${OrganizationSlug}/${CustomModelName}`;

export type SupportedModel = typeof SUPPORTED_MODELS[number] | CUSTOM_MODEL;
