import { Kinesis } from 'aws-sdk';

import { yaml2env } from '@audit/utils/yaml-reader';


import { ClientConfiguration } from 'aws-sdk/clients/datapipeline';

/**
 * This is to bind the kinesis stream locally to a local lambda. Here we fake the real 
 * AWS lambda env for handling kinesis streams
 * 
 * This is strictly for OFFLINE mode.
 */


// load all offline env properties
yaml2env('./src/config/env.yml', 'local');

const clientConfig: ClientConfiguration = {
    apiVersion: 'latest',
    region: process.env.KINESIS_REGION,    
    sslEnabled: `${process.env.KINESIS_SSL}` === 'true'
};

if (process.env.KINESIS_HOST) {
    clientConfig.endpoint = `${process.env.KINESIS_HOST}`;
}

export default clientConfig;

