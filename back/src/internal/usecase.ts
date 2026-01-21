import type { InputStory, OutputStory } from './dto';
import type { IRepo, IServices } from './ports';

export class UseCaseLayer {
	constructor(
		private repo: IRepo,
		private service: IServices,
	) {}

	createContent = async (info: InputStory): Promise<void> => {
		const words = extractUniqueWords(info.story);

		const missingWords = await this.repo.findMissingWords(words);
		if (missingWords.length === 0) {
			if (await this.repo.checkStoryExisting(info))
				throw new Error('Há história já está registrada');
			await this.repo.saveStory(info);
			return;
		}

		const newWords = await this.service.fetchWordsFromAI(missingWords);
		if (newWords.length === 0) {
			throw new Error('Não há palavras novas para salvar');
		}
		await this.repo.saveWords(newWords);

		if (await this.repo.checkStoryExisting(info))
			throw new Error('Há história já está registrada');
		await this.repo.saveStory(info);
	};

	getContentById = async (id: string): Promise<OutputStory> => {
		const story = await this.repo.getStoryId(id);

		if (!story) {
			throw new Error('Story não encontrada');
		}

		const wordsInStory = extractUniqueWords(story.story);

		const words = await this.repo.getWords(wordsInStory);

		return {
			id: story?._id!.toString(),
			title: story.title,
			story: story.story,
			moral: story.moral,
			words: words!.map((i) => ({
				id: i?._id!.toString(),
				term: i.term,
				partOfSpeech: i.partOfSpeech,
				definition: i.definition,
				examples: i.examples,
				synonyms: i.synonyms,
				translation: i.translation,
			})),
		};
	};

	getContentRandom = async (): Promise<OutputStory> => {
		const story = await this.repo.getStoryRandom();

		if (!story) {
			throw new Error('Story não encontrada');
		}

		const wordsInStory = extractUniqueWords(story.story);
		const words = await this.repo.getWords(wordsInStory);
		
		return {
			id: story?._id!.toString(),
			title: story.title,
			story: story.story,
			moral: story.moral,
			words: words!.map((i) => ({
				id: i?._id!.toString(),
				term: i.term,
				partOfSpeech: i.partOfSpeech,
				definition: i.definition,
				examples: i.examples,
				synonyms: i.synonyms,
				translation: i.translation,
			})),
		};
	};
}

function extractUniqueWords(text: string): string[] {
	const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];

	return [...new Set(words)];
}
