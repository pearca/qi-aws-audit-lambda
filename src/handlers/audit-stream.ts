import { Handler, Callback } from 'aws-lambda';
import { AuditEvent } from '@audit/models/event';

import clientConfig from  '@audit/utils/kinesis-client';
import { Kinesis } from 'aws-sdk';

const kinesis: Kinesis = new Kinesis(clientConfig);

const streams: any = 
    {
        "assess": process.env.KINESIS_STREAM_NAME_ASSESS_LOG as string
    };

/**
 * This processes either list of audit events where it will be in the following format
 * <code>
 * {
 *  "type": "assess",
 *  "payload": {}
 * }
 * </code>
 * @param event 
 * @param context 
 * @param callback 
 */
export const handle: Handler = (event: any, context: any, callback: Callback) => {
   
    event.Records.forEach((record: any) => {
        const payload = new Buffer(record.kinesis.data, 'base64').toString('utf-8');
        try {
            const eventPayload: AuditEvent = JSON.parse(payload);
            if (!eventPayload.type || !streams[eventPayload.type]) {
                console.warn(`Invalid payload type ${eventPayload.type}`);
                callback(null, `Invalid payload type ${eventPayload.type}`);
            } else {
                kinesis.putRecord({
                    Data: JSON.stringify(eventPayload.payload),
                    PartitionKey: eventPayload.partitionKey,
                    StreamName: streams[eventPayload.type]
                }, (err) => { 
                    if (err) {
                        console.error("Error", err);
                        callback(err, { statusCode: 500, body: "Error writing to kinesis" } );
                    } else { 
                        console.log("Return success from http after putting kinesis");
                        callback(null, { statusCode: 200, body: JSON.stringify({status: "Success"})} );
                    }
                });
            }

            console.log(`Audit processed`, eventPayload);
        } catch(e) {
            console.warn(`Error in payload json parse`, e);
            callback(null, `Error processing ${event.Records.length} event. ${e}`);
        }
       
    });
    
   
};