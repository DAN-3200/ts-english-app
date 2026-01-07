import type { Collection, MongoClient } from 'mongodb';
import type { Story, Word } from '../internal/entity';
import type { IPorts } from '../internal/ports';

export class RepositoryLayer implements IPorts {
	private word: Collection<Word> | undefined;
	private paragraph: Collection<Story> | undefined;

	constructor(private conn: MongoClient) {
		this.init(this.conn);
	}

	init = async (conn: MongoClient) => {
		const db = conn.db('dbmain'); // nome do banco

		const collectionsToCreate: string[] = ['word', 'paragraph']; // lista dos nomes das collections a serem criadas

		const existing = await db.listCollections().toArray();
		const existingNames = new Set(existing.map((i) => i.name));

		for (const name of collectionsToCreate) {
			if (!existingNames.has(name)) {
				await db.createCollection(name);
			}
		}

		this.word = db.collection<Word>('word');
		this.paragraph = db.collection<Story>('paragraph');
	};

	async getDataText() {
		const result = await this.paragraph
			?.aggregate([{ $sample: { size: 1 } }])
			.toArray();

		const texto = result?.[0]?.text;
		if (!texto) return null;

		const palavras = extrairPalavras(texto);

		const dadosDasPalavras = await this.word
			?.find({ palavra: { $in: palavras } })
			.toArray();

		return { texto, palavras, dadosDasPalavras };
	}

	async addWord(newWord: Word) {
		await this.word?.insertOne(newWord);
	}

	async addParagraph(newParagraph: Story) {
		await this.paragraph?.insertOne(newParagraph);
	}
}

function extrairPalavras(texto: string): string[] {
	return [
		...new Set(
			texto
				.toLowerCase()
				.replace(/[.,!?;:()"]/g, '')
				.split(/\s+/)
				.filter(Boolean)
		),
	];
}
