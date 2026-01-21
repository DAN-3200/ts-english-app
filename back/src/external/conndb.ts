import { MongoClient } from 'mongodb';

export async function connMongoDB(): Promise<MongoClient> {
	let URL = process.env.MONGO_URL!;
	const client = new MongoClient(URL);
	await client.connect();
	return client;
}

export const initCollections = async (conn: MongoClient) => {
	const db = conn.db('dbmain'); // nome do banco

	const collectionsToCreate: string[] = ['story', 'word']; // lista dos nomes das collections a serem criadas

	const existing = await db.listCollections().toArray();
	const existingNames = new Set(existing.map((i) => i.name));

	for (const name of collectionsToCreate) {
		if (!existingNames.has(name)) {
			await db.createCollection(name);
		}
	}
	return db
};
