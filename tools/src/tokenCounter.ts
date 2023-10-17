import {
  isWithinTokenLimit as isWithinTokenLimitGPT3,
} from 'gpt-tokenizer/model/gpt-3.5-turbo'

export const isWithinTokenLimit = (text: string, maxTokens: number) => {
  // this is a quick sanity check because gpt-tokenizer can get into a kind of crazy loop
  // on super huge documents.
  const words = text.split(" ")
  if (words.length * 5 > maxTokens) {
    return false;
  }

  if (words.length < maxTokens && text.length < (maxTokens)) {
    return true
  }

  return !!isWithinTokenLimitGPT3(text, maxTokens);
}