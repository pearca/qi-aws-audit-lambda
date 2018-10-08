import { Handler, Callback } from 'aws-lambda';

import { AssessAuditEvent } from '@audit/models/event';
import { ESClient } from '@audit/utils/elasti-client';

let esClient: ESClient;
/**
 * This processes either list of audit events where it will be in the following format
 * <code>
 * { events: [
     {
          "username": "mpaul",
          "userId": "A1000",
          "eventDate": 123456,
          "eventType": "sometype1",
          "area": "area1",
          "clientId": "CL0001",
          "clientName": "Jane",
          "deviceId": "asads100",
          "deviceName": "ipAd",
          "entity": "Internal QA",
          "bu": "US BU",
          "offline": true,
          "changes": [
               {
                    "fieldName": "fr",
                    "oldValue": "old",
                    "newValue": "new"
               }
          ]
     },
     {
          "username": "upaulm2",
          "userId": "B1000",
          "eventDate": 45555,
          "eventType": "sometype2",
          "area": "area2",
          "clientId": "CL0002",
          "clientName": "Joe",
          "deviceId": "asads200",
          "deviceName": "Android",
          "offline": false,
          "entity": "Internal QA1",
          "bu": "CA BU"
     }
]
}
 * </code>
 * @param event 
 * @param context 
 * @param callback 
 */
export const handle: Handler = (event: any, context: any, callback: Callback) => {
    if(!esClient) {
        esClient = new ESClient('assess', 'audit');
    }
    event.Records.forEach((record: any) => {
        const payload = new Buffer(record.kinesis.data, 'base64').toString('utf-8');
        const eventPayload: any = JSON.parse(payload);
        const events: AssessAuditEvent[] = eventPayload.events;
        console.log(`Received a Kinesis event:  for ${events.length} event(s)`, events);
        esClient.processAssessLogs(events);
    });
    callback(null, `Successfully processed ${event.Records.length} event.`);
};