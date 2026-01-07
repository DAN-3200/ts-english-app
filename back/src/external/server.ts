import Express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { RequestNewContent } from './service';

export default function runServer() {
	const server = Express();
	const port = process.env.PORT || 8080;

	server.use(Express.json(), morgan('dev'), cors());
	server.get('/content', async (_req, res) => {
		const response = await RequestNewContent();
		res.status(200).json(response);
	});

	server.listen(port, () => {
		console.clear();
		console.log(`\nserver running [http://localhost:${port}/] \n`);
	});
}
