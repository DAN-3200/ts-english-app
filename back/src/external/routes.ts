import Express from 'express';
import { RepositoryLayer } from './repository';
import { connMongoDB, initCollections } from './conndb';
import { ServiceLayerGemini } from './gemini.service';
import { UseCaseLayer } from '../internal/usecase';
import { ControllerLayer } from './controllers';

export async function routesManager(server: Express.Application) {
   const conn = await connMongoDB();
   const db = await initCollections(conn);
   const repository = new RepositoryLayer(db);
   const services = new ServiceLayerGemini();
   const usecase = new UseCaseLayer(repository, services);
   const handle = new ControllerLayer(usecase);

   server.get('/story/:id', handle.getContentById);
   server.get('/story-random', handle.getContentRandom);
}
