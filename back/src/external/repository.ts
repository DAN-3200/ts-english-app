import { ObjectId, type Collection, type Db, type MongoClient } from 'mongodb';
import type { Story, Word } from '../internal/entity';
import type { IRepo } from '../internal/ports';

export class RepositoryLayer implements IRepo {
	private word: Collection<Word> | undefined;
	private story: Collection<Story> | undefined;

	constructor(db: Db) {
		this.story = db.collection<Story>('story');
		this.word = db.collection<Word>('word');
	}

	async saveStory(info: Story): Promise<void> {
		await this.story?.insertOne(info);
	}
	async getStoryId(input: string): Promise<Story | null> {
		return await this.story!.findOne({ _id: new ObjectId(input) });
	}

	async checkStoryExisting(info: Story): Promise<boolean> {
		if (!this.story) {
			throw new Error('Story collection not initialized');
		}

		const exists = await this.story.countDocuments(
			{ title: info.title },
			{ limit: 1 },
		);

		return exists > 0 ? true : false;
	}

	async saveWords(info: Word[]): Promise<void> {
		if (!this.word) {
			throw new Error('Word collection not initialized');
		}
		const sanitized = info.map((word) => ({
			...word,
			synonyms: word.synonyms ?? [],
		}));

		try {
			await this.word.insertMany(sanitized);
		} catch (e) {
			console.error(e);
		}
	}
	async getWords(info: string[]): Promise<Word[] | null> {
		const words = await this.word!.find({ term: { $in: info } }).toArray();
		return words;
	}

	async getStoryRandom(): Promise<Story | null> {
		const exists = await this.story!.countDocuments();
		const random = Math.floor(Math.random() * exists);

		const storyRandom = await this.story!.find()
			.skip(random)
			.limit(1)
			.toArray();

		return storyRandom[0] ?? null;
	}

	async findMissingWords(info: string[]): Promise<string[]> {
		const existing = await this.word!.find(
			{ term: { $in: info } },
			{ projection: { term: 1 } },
		).toArray();

		const existingUnique = new Set(existing.map((doc) => doc.term));
		return info.filter((term) => !existingUnique.has(term));
	}
}
