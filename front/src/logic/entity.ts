export type PartOfSpeech =
	| 'noun'
	| 'verb'
	| 'adjective'
	| 'adverb'
	| 'pronoun'
	| 'preposition'
	| 'conjunction'
	| 'interjection';

export interface Word {
	id?: string;
	term: string;
	partOfSpeech: PartOfSpeech;
	definition: string;
	examples: string[];
	synonyms?: string[];
	translation: string;
}

export interface Paragraph {
	id?: string;
	title: string;
	content: string;
	wordsQuery: Word[];
}
