import { Kinesis } from 'aws-sdk';

import { ClientConfiguration } from 'aws-sdk/clients/datapipeline';

/**
 * Gets the kinesis client config for a stage
 */
export const getClientConfig = (): ClientConfiguration  => {
    const clientConfig: ClientConfiguration = {
        apiVersion: 'latest',
        region: process.env.KINESIS_REGION,    
        sslEnabled: `${process.env.KINESIS_SSL}` === 'true'
    };
    
    if (process.env.KINESIS_HOST) {
        clientConfig.endpoint = `${process.env.KINESIS_HOST}`;
    }
    return clientConfig;
};

