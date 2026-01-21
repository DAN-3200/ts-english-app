export interface OutputStory {
	id: string;
	title: string;
	story: string;
	moral: string;
	words: {
		id: string;
		term: string;
		partOfSpeech:
			| 'noun'
			| 'verb'
			| 'adjective'
			| 'adverb'
			| 'pronoun'
			| 'preposition'
			| 'conjunction'
			| 'interjection';
		definition: string;
		examples: string[];
		synonyms?: string[];
		translation: string;
	}[];
}
