import * as winston from 'winston'
import { NotificationHandler } from '@dexagod/ldn-agent';
import { InboxNotification } from '@dexagod/ldn-agent/dist/Utils/util';
var solid = require('solid-server')


export interface ServiceConfig {
  baseIRI: string,
  port: number;
  verbose?: boolean,
  podLocation: string,
  keyLocation: string,
}

export abstract class Service{
  protected serviceWebId: string;
  protected inbox: string;
  protected port: number;
  protected ldnAgent: NotificationHandler
  protected solidServer?: any;
  protected config: ServiceConfig


  constructor(config: ServiceConfig){
    this.serviceWebId = config.baseIRI ? config.baseIRI+'/card#service' : `http://localhost:${config.port}/card#service`,
    this.inbox = config.baseIRI ? config.baseIRI+'/inbox/' : `http://localhost:${config.port}/inbox/`,
    this.port = config.port,
    this.ldnAgent = new NotificationHandler({verbose: config.verbose})
    this.config = config;
  }

  /**
   * Initialize the service-independent functionality.
   */
  async run() {
    const options = this.config;
    winston.add(new winston.transports.Console({level: options?.verbose ? "verbose" : "warn"}))
    
    var ldp = solid.createServer({
      key: this.config.keyLocation + 'key.pem',
      cert: this.config.keyLocation + 'cert.pem',
      root: this.config.podLocation,
      webid: false, // TODO:: authentication
    })
  
    await new Promise((resolve, reject) => {
      ldp.listen(this.port, function() {
        resolve(null)
      })
    })

    console.log(`Running service at: ${this.serviceWebId}`)

    this.solidServer = ldp;

    const asyncIterator = await this.ldnAgent.watchNotifications({inbox: this.inbox , 
      filters: [
        {
          name: "subscription", 
          shapeFileURI: './shapes/subscriptionshape.ttl'
        },
        {
          name: "submission", 
          shapeFileURI: './shapes/submissionshape.ttl'
        },
      ]})
  
    asyncIterator.on('readable', () => {
      console.log('READABLE')
      let notification;
      while (notification = asyncIterator.read()){
       this.processNotification(notification);
      }
    });
  }

  /**
   * Run the service
   */
  protected abstract processNotification(notification: InboxNotification) : Promise<void>;
}