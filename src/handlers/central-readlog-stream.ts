import { Handler, Callback } from 'aws-lambda';


import { ESClient } from '@audit/utils/elasti-client';
import { CentralReadEvent } from '@audit/models/event';

let esClient: ESClient;
/**
 * This processes either list of audit events where it will be in the following format
 * <code>
    {
    "userId": "1000",
    "username": "username",
    "userBusinessEntity": "BE",
    "userBusinessUnit": "US",
    "eventDate": "20181008T164238+0000",
    "readEntity": "Patient",
    "readEntityId": "P1000"
    }
 * </code>
 * @param event 
 * @param context 
 * @param callback 
 */
export const handle: Handler = (event: any, context: any, callback: Callback) => {
    if(!esClient) {
        esClient = new ESClient('central_read', 'audit');
    }
    const events: CentralReadEvent[] = [];
    event.Records.forEach((record: any) => {
        const payload = new Buffer(record.kinesis.data, 'base64').toString('utf-8');
        const eventPayload: CentralReadEvent = JSON.parse(payload);
       
        console.log(`Received a Kinesis event:  for central read`, eventPayload);
        events.push(eventPayload);
    });
    if (events.length > 0) {
        esClient.processCentralReadLogs(events);
    }
    callback(null, `Successfully processed ${event.Records.length} event.`);
};