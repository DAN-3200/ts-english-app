import data from '../../public/data.json';
import { getTextContent } from '../infra/service/service';
import type { Paragraph } from './entity';
import { atom } from 'jotai';

export const ParagraphQuery = atom<Paragraph[]>(data as Paragraph[]);
export const fetchParagraphAtom = atom(
  null,
  async (_get, set) => {
    const result = await getTextContent();
    set(ParagraphQuery, result);
  }
);

export const ctxMain = {
	ParagraphQuery,
};
