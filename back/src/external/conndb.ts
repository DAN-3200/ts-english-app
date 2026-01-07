import { MongoClient } from 'mongodb';

export async function connMongoDB(): Promise<MongoClient> {
	let URL = process.env.MONGO_URL!;
	const client = new MongoClient(URL);
	await client.connect();
	return client;
}
