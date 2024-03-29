import { Kinesis, Request, AWSError } from 'aws-sdk';

import { getClientConfig }  from  '@audit/utils/kinesis-client';
import { String } from 'aws-sdk/clients/discovery';
import { yaml2env } from '@audit/utils/yaml-reader';

/**
 * This is to bootstrap a kinesis stream in local env. Obviously this doesnt happen in 
 * real AWS as a kinesis server will be already setup with a stream.
 * 
 * This is strictly for OFFLINE mode.
 */
// load all offline env properties
yaml2env('./src/config/env.yml', 'local');
const kinesis: Kinesis = new Kinesis(getClientConfig());

const createStream = (streamName: String) => {
    const request: Request<{}, AWSError> =
        kinesis.createStream({ ShardCount: 1, StreamName: streamName});
    request.send ((err: AWSError, data) => {
        if (err) {
            if (err.code === "ResourceInUseException") { // already exists in local, we just continue
                console.log(`Bootstrap: Success - Kinesis stream '${streamName}' already exists`);
                process.exit(0);
            } else {
                // something bad happened and we just cant create the stream locally
                console.error(`Bootstrap: Failed - Create Kinesis stream '${streamName}' failed with error ${err.stack}`);
                process.exit(1);
            }
        } else {
            console.log(`Bootstrap: Success - Kinesis stream '${streamName}' created`);
            process.exit(0);
        }
    });
};

[
    process.env.KINESIS_STREAM_NAME_AUDIT_LOG, 
    process.env.KINESIS_STREAM_NAME_ASSESS_LOG, 
    process.env.KINESIS_STREAM_NAME_CENTRAL_READ_LOG
].forEach(streamName => createStream(streamName as string));

