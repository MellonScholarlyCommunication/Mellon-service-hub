import { AwarenessService, AwarenessServiceConfig } from './services/awareness/AwarenessService';

export class ServiceHub{
  public async runAwarenessService(config: AwarenessServiceConfig){
    const service = new AwarenessService(config)
    service.run()
  }
}
