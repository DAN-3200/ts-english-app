import type { ObjectId } from 'mongodb';

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
	_id?: ObjectId | string;
	term: string;
	partOfSpeech: PartOfSpeech;
	definition: string;
	examples: string[];
	synonyms?: string[];
	translation: string;
}

export interface Story {
	_id?: ObjectId | string;
	title: string;
	story: string;
	moral: string;
}
