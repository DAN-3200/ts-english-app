import type { Story } from './entity';
import type { IPorts } from './ports';

export class UseCase {
	constructor(private repo: IPorts) { }

	getDataText = async (): Promise<Story> => {
		return this.repo.getDataText();
	};
}
