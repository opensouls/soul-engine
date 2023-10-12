import {
  isWithinTokenLimit,
} from './tokenCounter'

const HEADER_REGEX = /((?<=\n[-]{2,}\n)|(?=\n# |\n## |\n### |\n#### ))/g;

const PUNCTUATION = /[\.\?\!]\s/g

function combineSections(sections: string[], maxTokensPerSection: number): string[] {
  let combinedSections: string[] = [];
  let currentSection = "";

  for (let section of sections) {
    if (isWithinTokenLimit(currentSection + section, maxTokensPerSection)) {
      currentSection += section;
    } else {
      combinedSections.push(currentSection);
      currentSection = section;
    }
  }

  if (currentSection) {
    combinedSections.push(currentSection);
  }

  return combinedSections;
}

const containsMarkdownHeader = (line: string, nextLine: string) => {
  return /^#+\s*/.test(line) || /^-{2,}/.test(nextLine) || /^={2,}/.test(nextLine)
}

const countHeaders = (text: string) => {
  const lines = text.split('\n');
  let count = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // If the line is a header, start a new section
    if (containsMarkdownHeader(line, nextLine)) {
      count++
    }
  }
  return count
}

const splitTextByHeaders = (text: string) => {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // If the line is a header, start a new section
    if (containsMarkdownHeader(line, nextLine)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = '';
    }
    currentSection += line + '\n';
  }

  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections
}
const splitTextByPunctuation = (text: string, maxTokensPerSection: number) => {
  let sections: string[] = [];
  let currentSection = "";
  const sentences = text.split(PUNCTUATION);

  for (let sentence of sentences) {
    if (isWithinTokenLimit(currentSection + sentence, maxTokensPerSection)) {
      currentSection += sentence;
    } else {
      if (isWithinTokenLimit(sentence, maxTokensPerSection)) {
        sections.push(currentSection);
        currentSection = sentence;
      } else {
        // If the sentence is too large, split it into words
        const words = sentence.split(' ');
        for (let word of words) {
          if (isWithinTokenLimit(currentSection + word, maxTokensPerSection)) {
            currentSection += word;
          } else {
            sections.push(currentSection);
            currentSection = word;
          }
        }
      }
    }
  }

  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

export function splitSections(markdown: string, maxTokensPerSection = 2000): string[] {
  try {
    if (markdown.length === 0) {
      return [];
    }
    let sections: string[] = [];

    // If the markdown is less than maxTokensPerSection then just return the whole thing
    if (isWithinTokenLimit(markdown, maxTokensPerSection)) {
      return [markdown];
    }

    // Split the markdown into sections by headers
    const headerSections = splitTextByHeaders(markdown);
    for (const section of headerSections) {
      if (isWithinTokenLimit(section, maxTokensPerSection)) {
        sections.push(section);
        continue
      }
      if (countHeaders(section) >= 2) {
        sections = sections.concat(splitSections(section, maxTokensPerSection));
        continue
      }
      const punctuationSections = splitTextByPunctuation(section, maxTokensPerSection);
      sections = sections.concat(punctuationSections);
    }

    return combineSections(sections, maxTokensPerSection)
  } catch (err) {
    console.error('error splitting sections', err)
    throw err
  }
}