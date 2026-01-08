import { GoogleGenAI } from '@google/genai';
import type { Story } from '../internal/entity';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function RequestNewContent() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: PromptGeracional,
  });

  const cleanJSON = response.text!.replace(/```/g, '').replace(/json/g, '');

  const finalJson = [JSON.parse(cleanJSON)];

  console.log(finalJson);
  return finalJson as Story[];
}

const PromptGeracional = `
You are a precise English linguistic analyzer and content generator.

Produce one valid JSON object only, strictly following this TypeScript shape:

{
  "id"?: string,
  "title": string,
  "content": string,
  "wordsQuery": {
    "id"?: string,
    "term": string,
    "partOfSpeech":
      | "noun"
      | "verb"
      | "adjective"
      | "adverb"
      | "pronoun"
      | "preposition"
      | "conjunction"
      | "interjection",
    "definition": string,
    "examples": string[],
    "synonyms"?: string[],
    "translation": string
  }[]
}

Content rules:
- The "content" field must be 60 words or fewer.
- Use clear, simple English in present tense.
- Avoid lists, quotes, or special formatting.
- The content must be grammatically correct and natural.

wordsQuery rules:
- Generate one wordsQuery entry for every unique word in content.
- Words are lowercased, punctuation removed, no duplicates.
- Include all word types, including articles, pronouns, prepositions, and conjunctions.
- Order wordsQuery by first appearance in content.

Per-word constraints:
- term: exact word from content, lowercase.
- partOfSpeech: choose the role used in the given content and must match the allowed literals.
- definition: no more than 20 words, learner-friendly English.
- examples: exactly 2 sentences, each 8–15 words, present tense, natural usage.
- synonyms: optional, include only when appropriate, 2–4 short words.
- translation: accurate Portuguese translation of the word in this context.

Output constraints:
- Output valid JSON only.
- No markdown.
- No explanations.
- No comments.
- No extra fields.
- Ensure correct data types.
`;