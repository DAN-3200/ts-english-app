import Express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { routesManager } from './routes';

export default function runServer() {
	const server = Express();
	const port = process.env.PORT || 8080;

	server.use(Express.json(), morgan('dev'), cors());
	routesManager(server);

	server.listen(port, () => {
		console.clear();
		console.log(`\nserver running [http://localhost:${port}/] \n`);
	});
}
