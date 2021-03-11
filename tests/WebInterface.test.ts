import { AwarenessService } from './../src/service';
import { FollowTypes } from '../src/util';
import { DatabaseManager } from '../src/DatabaseManager';
import { NotificationHandler } from '@dexagod/ldn-agent';
import winston from 'winston';
import * as fs from 'fs'
import ns from '../src/NameSpaces';

const path = require('path');

winston.add(new winston.transports.Console({level: "warn"}))

describe('Test for the WebInterface of the service', () => {
  let service: AwarenessService;
  let handler: NotificationHandler;
  const inboxURI = 'http://localhost:1234/tests/inbox/'
  const serviceCardURI = 'http://localhost:1234/tests/cards/card.ttl#service'
  
  let processNotificationSpy : any;
  beforeAll(async () => {
    service = new AwarenessService();
    service.inboxURI = inboxURI
    service.serviceCardURI = serviceCardURI

    handler = new NotificationHandler({})
    processNotificationSpy = jest.spyOn(AwarenessService.prototype as any, 'processNotification');

    await service.run();

    // clear inbox
    const directory = 'tests/inbox/';

    fs.readdir(directory, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        fs.unlink(path.join(directory, file), err => {
          if (err) throw err;
        });
      }
    });
  });

  afterAll(async () => {
    await service.close();
  });

  it('Service should add subscription on follow notification action', async () => {
    const testPersonId = "http://localhost:1234/tests/cards/person1card.ttl#person"
    const notificationJSONLD = JSON.parse(fs.readFileSync('tests/testNotifications/subscription.jsonld', {encoding: 'utf-8'}))
    // Add person and service data to notification
    notificationJSONLD["actor"]["@id"] = testPersonId;
    notificationJSONLD["target"]["url"] = serviceCardURI;

    // Add the properties on which should be subscribed
    notificationJSONLD["object"].push(
      {
        [ns.demo('property')]: ns.demo('keyword'),
        [ns.demo('propertyValue')]: "testvalue"
      }
    )

    

    const options = {
      from: [testPersonId],
      to: [serviceCardURI],
      contentType: "application/ld+json",
      contentTypeOutput: "application/ld+json",
      notification: JSON.stringify(notificationJSONLD, null, 2)
    }

    // Send the notification
    await handler.sendNotification(options)
    

    await new Promise((resolve, reject) => setTimeout(() => {
      resolve(null)
    }, 3000))

    console.log('DUMP', await (service as any).dbManager.dump())
    await (service as any).dbManager.cleardb()

    await new Promise((resolve, reject) => setTimeout(() => {
      resolve(null)
    }, 3000))
    
    

  });
  
});