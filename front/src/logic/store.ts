import { getTextContent } from '../infra/service/service';
import type { Story } from './entity';
import { atom } from 'jotai';

export const ParagraphQuery = atom<Story[]>([
	{
		_id: '',
		title: '',
		story: '',
		moral: '',
		words: [],
	},
] as Story[]);

export const fetchParagraphAtom = atom(null, async (_get, set) => {
	const result = await getTextContent();
	set(ParagraphQuery, [
		{
			_id: result.id,
			title: result.title,
			story: result.story,
			moral: result.moral,
			words: result.words,
		},
	]);
});

export const ctxMain = {
	ParagraphQuery,
};
