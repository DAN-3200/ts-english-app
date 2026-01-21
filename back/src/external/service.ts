import { GoogleGenAI } from '@google/genai';
import type { Word } from '../internal/entity';
import type { IServices } from '../internal/ports';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export class ServiceLayer implements IServices {
	fetchWordsFromAI = async (info: string[]): Promise<Word[]> => {
		const prompt = `
      Generate a JSON array for the words below using the exact schema.

      Input:
      ${info}

      Rules:
      - Output valid JSON only (single array). No extra text.
      - Exclude proper nouns. When unsure, exclude.

      Schema:
      {
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
      }

      Constraints:
      - term: exact input word, lowercase.
      - partOfSpeech: role used in context.
      - definition: <= 20 words, learner-friendly English.
      - examples: exactly 2 present-tense sentences, each 8–15 words.
      - synonyms: optional, 2–4 single words only.
      - translation: accurate Portuguese translation in this context.
    `;

		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash-lite',
			contents: prompt,
		});

		if (!response.text) {
			throw new Error('Empty AI response');
		}

		const cleanJSON = response.text!.replace(/```/g, '').replace(/json/g, '');
		const finalJson = JSON.parse(cleanJSON);

		if (!Array.isArray(finalJson)) {
			throw new Error('AI response is not an array');
		}

		return finalJson as Word[];
	};
}
