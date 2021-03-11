import * as winston from 'winston'
import { DatabaseManager } from './DatabaseManager';
import ns from './NameSpaces';
import * as N3 from "n3"
import { FollowTypes } from './util';
import { getResourceAsQuadArray } from "@dexagod/rdf-retrieval"
import { generatePublicationNotification } from './NotificationGeneration';
import { InboxNotification } from '@dexagod/ldn-agent/dist/Utils/util';
import { Service, ServiceConfig } from '../service/Service';
var solid = require('solid-server')

export interface AwarenessServiceConfig extends ServiceConfig {
  mongoDBURI: string
}

export class AwarenessService extends Service {
  private dbManager: DatabaseManager;

  constructor(config: AwarenessServiceConfig) {
    super(config);
    this.dbManager = new DatabaseManager(config.mongoDBURI);
  }

  protected async processNotification(notification: InboxNotification | null) {
    if (!notification) return;
    const store = new N3.Store(notification.quads)

    if (notification.filterName === "subscription") {
      const subscriptions = store.getQuads(null, ns.rdf('type'), ns.demo("Subscribe"), null);
      console.log('subscriptions', subscriptions)
      if (subscriptions && subscriptions.length !== 0) {
        await this.processSubscriptionRequest(store, subscriptions.map(q => q.subject.id))
      } 
    } else if (notification.filterName === "submission") {
      const requests = store.getQuads(null, ns.rdf('type'), ns.demo("ServiceRequest"), null);
      console.log('requests', requests)
      if (requests && requests.length !== 0) {
        await this.processServiceRequest(store, requests.map(e => e.subject.id))
      }
    }

    console.log('DUMP', await this.dbManager.dump())
  }


  private async processServiceRequest(store: N3.Store, ids: string[]) {
    const rootId = ids[0]
    const actorIds = store.getQuads(rootId, ns.as('actor'), null, null).map(q => q.object.id)
    const objectIds = store.getQuads(rootId, ns.as('object'), null, null).map(q => q.object.id)

    const artefactId = objectIds && objectIds.length && objectIds[0]

    winston.log('verbose', `Processing service request for ${artefactId}`)

    if(artefactId) {
      const store = new N3.Store();
      try {
        const artefactQuads = await getResourceAsQuadArray(artefactId)
        store.addQuads(artefactQuads)
      } catch (_ignore) {}
      try {
        const artefactMetadataQuads = await getResourceAsQuadArray(artefactId.split("#")[0] + ".meta")
        store.addQuads(artefactMetadataQuads)
      } catch (_ignore) {}

      const artefactType = store.getQuads(artefactId, ns.rdf('type'), null, null).map(q => q.object.id)



      if (artefactType && artefactType.length) {
        if (artefactType[0] === ns.demo('Publication')) {
          const mappings = []
          store.getQuads(artefactId, ns.demo('Author'), null, null).map(q => { 
            mappings.push({property: FollowTypes.author , value: q.object.id})
          })
          store.getQuads(artefactId, ns.demo('Keyword'), null, null).map(q => {
            mappings.push({property: FollowTypes.keyword , value: q.object.id})
          })
          store.getQuads(artefactId, ns.demo('Title'), null, null).map(q => {
            mappings.push({property: FollowTypes.title , value: q.object.id})
          })
          mappings.push({property: FollowTypes.artefact , value: artefactId})
          
          const followerEntries = await this.dbManager.findFollowers(mappings)
          for (let entry of Array.from(followerEntries.entries())) {
            const notification = generatePublicationNotification(artefactId, entry[0], entry[1])
            this.sendNotifications(entry[0], artefactId, notification)
          }
        }
        else if (artefactType[0] === ns.demo('Interaction')) {
          // TODO::
        }
      }
    }
  }

  // TODO:: validate that only sender can be added as a subject
  private async processSubscriptionRequest(store: N3.Store, ids: string[]) {
    const rootId = ids[0]
    const actorIds = store.getQuads(rootId, ns.as('actor'), null, null).map(q => q.object.id)
    const objectIds = store.getQuads(rootId, ns.as('object'), null, null).map(q => q.object.id)
    const objects = objectIds.map(id => 
      { return {
        property: store.getQuads(id, ns.demo('property'), null, null).map(q => q.object.value)[0],
        value: store.getQuads(id, ns.demo('propertyValue'), null, null).map(q => q.object.value)[0],
      }}
    )

    // Normalized the objects being subscribed to
    const normalizedObjects = []
    for (let object of objects) {
      console.log('object', object)
      const normalizedProperty = getNormalizedProperty(object.property)
      console.log('normalizedProperty', normalizedProperty)
      if ( normalizedProperty ) {
        normalizedObjects.push({
          property: normalizedProperty, 
          value: object.value
        })
      }
    }
    
    // Add the subscriptions to the database
    if (normalizedObjects.length !== 0) {
      for (let id of actorIds) {
        console.log('adding', normalizedObjects)
        this.dbManager.addFollowAction(id, undefined, normalizedObjects)
      }
    }
    
  }


  private async sendNotifications(receiverId: string, artefactId: string, notification: string) {
    winston.log('verbose', `Sending notifications to ${receiverId} for ${artefactId}`)
    const options = {
      notification, 
      to: [ receiverId ], 
      from: [ this.serviceWebId ], 
      contentType: "application/ld+json", 
      contentTypeOutput: "application/ld+json"}
    this.ldnAgent.sendNotification(options)
  }

  close () {
    if (this.solidServer) this.solidServer.close();
  }
}

function getNormalizedProperty(followProperty: string) {
  switch(followProperty) {
    case ns.demo('Keyword'):
      return FollowTypes.keyword
    case ns.demo('Author'):
      return FollowTypes.author
    case ns.demo('ArtefactId'):
      return FollowTypes.artefact
    default:
      return null;
  }  
}



