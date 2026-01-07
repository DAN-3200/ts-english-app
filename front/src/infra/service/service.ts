import type { Paragraph } from '../../logic/entity';
import { HttpClient } from './httpClient';

const api = new HttpClient(import.meta.env.VITE_API_URL);

export async function getTextContent(): Promise<Paragraph[]> {
	return api.get(`/content`);
}
