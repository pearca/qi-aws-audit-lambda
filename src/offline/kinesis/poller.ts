import { Kinesis } from 'aws-sdk';

/**
 * Inspired from https://github.com/tarwn/local-kinesis-lambda-runner
 */

export const poll = (kinesis: Kinesis, StreamName: string, logger: any) => {

    const wait = (ms: number) => () => new Promise(resolve => setTimeout(resolve, ms));

    const callback = (err: any, result: any) => (
        err ? logger.error(`Handler failed: ${err.message}`) : logger.log(`Handler suceeded: ${result}`)
    );

    const mapKinesisRecord = (record: any) => ({
        data: record.Data.toString('base64'),
        sequenceNumber: record.SequenceNumber,
        approximateArrivalTimestamp: record.ApproximateArrivalTimestamp,
        partitionKey: record.PartitionKey,
    });

    const reduceRecord = (lambda: any) => (promise: Promise<any>, kinesisRecord: any) => promise.then(() => {
        const singleRecordEvent = { Records: [{ kinesis: mapKinesisRecord(kinesisRecord) }] };
        logger.log('Invoking lambda with record from stream:', JSON.stringify(singleRecordEvent));
        return lambda(singleRecordEvent, null, callback);
    });

    const pollKinesis = (lambda: any) => (firstShardIterator: any) => {
        const fetchAndProcessRecords = (shardIterator: any) => (
            kinesis.getRecords({ ShardIterator: shardIterator }).promise().then((records: any) => (
                records.Records.reduce(reduceRecord(lambda), Promise.resolve())
                    .then(wait(500))
                    .then(() => fetchAndProcessRecords(records.NextShardIterator))
            ))
        );
        return fetchAndProcessRecords(firstShardIterator);
    };

    const run = (lambda: any) => {
        const loop = () => (
            kinesis.describeStream({ StreamName }).promise()
                .then((stream) => {
                    logger.log(`Found ${StreamName}!`);
                    const { ShardId } = stream.StreamDescription.Shards[0];

                    const params = { StreamName, ShardId, ShardIteratorType: 'LATEST' };
                    return kinesis.getShardIterator(params).promise();
                })
                .then((shardIterator) => {
                    logger.log('Polling kinesis for events...');
                    return shardIterator.ShardIterator;
                })
                .then(pollKinesis(lambda))
                .catch((err) => {
                    logger.error(err);
                    logger.log('Restarting...');
                    setTimeout(loop, 2000);
                })
        );
        loop();
    };

    return run;
};