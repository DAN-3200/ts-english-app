import type { Request, Response } from 'express';
import type { UseCaseLayer } from '../internal/usecase';

export class ControllerLayer {
	constructor(private usecase: UseCaseLayer) {}

	getContentById = async (req: Request, res: Response) => {
		let paramId = req.params.id as string;
		let response = await this.usecase.getContentById(paramId);
		res.status(200).json(response);
	};

	getContentRandom = async (_req: Request, res: Response) => {
		let response = await this.usecase.getContentRandom();
		res.status(200).json(response);
	};
}
