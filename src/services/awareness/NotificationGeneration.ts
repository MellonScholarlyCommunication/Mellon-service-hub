import { FollowTypes } from './util';
/**
 * Generate JSON-LD string of the publication awareness notification
 * @param artefactId The artefact to be made aware
 * @param targetId The awareness target
 * @param triggers The triggers causing the awareness event notification
 */
export function generatePublicationNotification(artefactId: string, targetId:string, triggers: {property: FollowTypes, value: string}[]) {
  const notification: any = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "summary": "Awareness event for new publication",
    "@type": "Announce",
    "actor": {
      "@type": "Service",
      "name": "Awareness service",
      "url": "https://www.servicehub1.org/awarenessservice"
    },
    "object": {
      "summary": "Awareness lifecycle event",
      "@type": "https://www.example.org/ontology#AwarenessEvent",
      "actor": {
        "@type": "Service",
        "name": "Awareness service",
        "url": "https://www.servicehub1.org/awarenessservice",
      },
      "object": {
      "@id": artefactId,
      "@type": "https://www.example.org/ontology#Publication"
      }
    },
    "to": [ {
      "@type": "Person",
      "url": targetId,
    } ],
    "https://www.example.org/ontology#eventTriggers": [

    ]
  }

  for (let trigger of triggers) {
    notification["https://www.example.org/ontology#eventTriggers"].push(
      {
        "https://www.example.org/ontology#property": trigger.property,
        "https://www.example.org/ontology#propertyValue": trigger.value,
      }
    )
  }

  // Return stringified jsonld
  return JSON.stringify(notification, null, 2)
}



export function generateFollowNotification(follower: string, following:string) {
  const notification = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "summary": "Notification of new follower",
    "@type": "Follow",
    "actor": {
      "@id": follower,
      "@type": "Person",
    },
    "object": {
      "@id": following,
      "@type": "Person",
    }
  }
  return JSON.stringify(notification, null, 2)
}