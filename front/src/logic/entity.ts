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
	_id?: string;
	term: string;
	partOfSpeech: PartOfSpeech;
	definition: string;
	examples: string[];
	synonyms?: string[];
	translation: string;
}

export interface Story {
	_id?: string;
	title: string;
	story: string;
	moral: string;
	words: Word[];
}
