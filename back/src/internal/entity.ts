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

export interface StoryWord {
	wordId: string;
	isTarget: boolean; // palavra foco da história
}

export type Level = 'A1' | 'A2' | 'B1';

export interface Story {
	id?: string;
	level: Level;
	title: string;
	paragraphs: string[]; // suporta paragrafos separadamente
	words: StoryWord[]; // contém consulta de todas as palavras do texto
}
