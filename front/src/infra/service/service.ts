import type { OutputStory } from './dto';
import { HttpClient } from './httpClient';

const api = new HttpClient(import.meta.env.VITE_API_URL);

export async function getTextContent(): Promise<OutputStory> {
	return api.get(`/story-random`);
}
