import type { Story, Word } from './entity';

export interface IRepo {
	saveStory(info: Story): Promise<void>;
	getStoryId(input: string): Promise<Story | null>;
	checkStoryExisting(info: Story): Promise<boolean>;
	getStoryRandom(): Promise<Story | null>;

	saveWords(info: Word[]): Promise<void>;
	getWords(info: string[]): Promise<Word[] | null>;
	findMissingWords(info: string[]): Promise<string[]>;
}

export interface IServices {
	fetchWordsFromAI(info: string[]): Promise<Word[]>;
}
