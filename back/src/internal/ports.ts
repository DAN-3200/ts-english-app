import type { Story } from './entity';

export interface IPorts {
	getDataText(): Promise<Story>;
}
