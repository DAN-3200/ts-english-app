import type { Request, Response } from 'express';
import type { UseCaseLayer } from '../internal/usecase';

export class ControllerLayer {
	constructor(private usecase: UseCaseLayer) {}

	getContent = async (req: Request, res: Response) => {
		let paramId = req.params.id as string;
		let response = await this.usecase.getContent(paramId);
		res.status(200).json(response);
	};
}
