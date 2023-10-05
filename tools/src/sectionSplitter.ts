import {
    isWithinTokenLimit,
} from 'gpt-tokenizer/model/gpt-3.5-turbo'

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


const splitTextByHeaders = (text: string) => {
    const lines = text.split('\n');
    const sections = [];
    let currentSection = '';
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
    
      // If the line is a header, start a new section
      if (/^#+\s*/.test(line) || /^-{2,}/.test(nextLine) || /^={2,}/.test(nextLine)) {
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
    let smallerSections: string[] = [];
    const sections = text.split(PUNCTUATION);
    for (const section of sections) {
        if (isWithinTokenLimit(section, maxTokensPerSection)) {
            smallerSections.push(section);
            continue
        }
        // otherwise split on spaces
        const words = section.split(' ');
        smallerSections = smallerSections.concat(words)
    }
    return smallerSections
}

export function splitSections(markdown: string, maxTokensPerSection = 2000): string[] {
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
        if (HEADER_REGEX.test(section)) {            
            sections = sections.concat(splitSections(section, maxTokensPerSection));
            continue
        }
        const punctuationSections = splitTextByPunctuation(section, maxTokensPerSection);
        sections = sections.concat(punctuationSections);
    }

    return combineSections(sections, maxTokensPerSection)
}