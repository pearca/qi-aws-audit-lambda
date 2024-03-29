
# Audit log processing with AWS Serverless and Kinesis streams

## Design

![Architecture](doc/arch.jpg "Architecture")


### Assess
Assess sends the audit events collected over time , offline or online , over to Central through a sync process.

### Central
- Audit events are logged using Log4j to a file in each App server
- [Kinesis agent](https://github.com/awslabs/amazon-kinesis-agent) tails and sends the logs to a generic audit AWS Kinesis stream
- The Generic AWS Kinesis stream forwards to a specific Kinesis stream based on a type and partitions it
- The specific stream processes the payload and sends it over to AWS Elasticsearch under an Index
- Kibana is used to interrogate into these indices for events

### Qiactive 
- An example branch is in [assess-audit-logger-log-file](https://github.com/pearca/qiactive/compare/assess-audit-logger-log-file?expand=1)


## Local Setup

This is primarily for emulating the AWS Elastisearch, Kinesis and Lambda locally before deploying to AWS.

### Elasticsearch
Install from https://www.elastic.co/downloads. 
Once extracted, add the `bin` to path (bash_profile etc ) and test by running 
```sh
elasticsearch
```
Open a browser and go to http://localhost:9200 to check the status. 
Kill the elasticsearch server as this will be started using npm.

### Kibana

Install Kibana as documented in https://www.elastic.co/downloads. 

Once extracted, add the `bin` to path (bash_profile etc ) and test by running 
```sh
kibana
```
Open a browser and go to http://localhost:5601 to explore the UI. 
Kill the kibana server as this will be started using npm.

### Kinesis Agent
For ease of starting the kinesis agent an 'uber' kinesis jar is provided in [here](kinesis-agent/). As the name implies an uber jar is a jar which contains all the dependent jars bundled into a single jar.
This is by cloning the [Kinesis Agent Git Repo](https://github.com/awslabs/amazon-kinesis-agent.git) and modifying the pom.xml as
- Including xml and properties into resources
```
 <resources>
        <resource>
            <directory>src</directory>
            <includes>                      
                <include>**/*.xml</include>
                 <include>**/*.properties</include>
            </includes>
        </resource>

        .. etc
</resources>
```
- Using shade mvn plugin to create the uber jar
```
<plugins>
 <plugin>
              <groupId>org.apache.maven.plugins</groupId>
              <artifactId>maven-shade-plugin</artifactId>
              <executions>
                  <execution>
                      <phase>package</phase>
                      <goals>
                          <goal>shade</goal>
                      </goals>
                  </execution>
              </executions>
              <configuration>
                  <finalName>uber-${artifactId}-${version}</finalName>
                  <transformers>
                    <!-- add Main-Class to manifest file -->
                    <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                    <mainClass>com.amazon.kinesis.streaming.agent.Agent</mainClass>
                  </transformer>
                  </transformers>
              </configuration>
        </plugin>

        .. etc
</plugins>
</build>
```

- Package 
`mvn clean package`

### Offline mode

Allow to run the system locally in offline mode.
`npm run offline`

This:
- Starts **Kinesis** using the kinesalite npm module to emulate kinesis
- Creates the required Kinesis streams for Audit log
- Starts a listener on to the above stream so as to invoke the handler
- Starts a demo http endpoint which can be used to test to insert an object into Kinesis
- Starts the kinesis agent watching log files. Look at `./kinesis-agent/agent.json`


### Test Publish to Kinesis

The kinesis agent in here tails `/tmp/choose-share/audit-kinesis-agent.log`. So if you pipe in the following json into a new line at the end, the agent picks it up and sends it to the generic Kinesis stream as configured in the **agent.json**. Note that the json should be a single line.
- For assess
```json
{
    "type": "assess",
    "partitionKey": "US",
    "payload": {
        "events": [
            {
                "username": "mpaul",
                "userId": "A1000",
                "eventDate": "20181002T161932+0000",
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
                "eventDate": "20181011T161932+0000",
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
}
```

- For Central read logs
```json
{
  "type": "central_read_log",
  "partitionKey": "Patient",
  "payload": {
    "userId": "77BB6D4296FB1A57E050007F010023EC",
    "username": "Jane",
    "userBusinessEntity": "My New Entity",
    "userBusinessUnit": "Pearson US",
    "eventDate": "20181008T165728+0000",
    "readEntity": "Patient",
    "readEntityId": "77BB6D42C51D1A57E050007F010023EC"
  }
}
```

Typically I use the `groovysh` way as follows:-

```sh
groovysh

groovy:000> f = new File("/tmp/choose-share/audit-kinesis-agent.log")
groovy:000> f << {"type":"assess","partitionKey":"en-au","payload":{"events":[{"username":"mpaul","userId":"A1000","eventDate":1538664479412,"eventType":"sometype1","area":"area1","clientId":"CL0001","clientName":"Jane","deviceId":"asads100","deviceName":"ipAd","entity":"InternalQA","bu":"USBU","offline":true,"changes":[{"fieldName":"fr","oldValue":"old","newValue":"new"}]},{"username":"upaulm2","userId":"B1000","eventDate":1538664479412,"eventType":"sometype2","area":"area2","clientId":"CL0002","clientName":"Joe","deviceId":"asads200","deviceName":"Android","offline":false,"entity":"Internal QA1","bu":"CA BU"}]}}

```
### Unit tests

`npm test`

## AWS Deployment

### Pre-requisites
An Elasticsearch and Kibana UI needs to be setup preferable with proper access privileges and domain names, for eg http://kibana.*qiactive/qidevteam*.com etc. 

(Note this can be part of the serverless deployment so that this automatically created as part of stack creation process). This only needs to be added to the `resources` section of the `serverless.yml`

### Setup
Obtain the aws credentials, the access and secret key
- AWS access keys and secret keys as env variables setup either in `~/.aws/credentials` using `aws configure` commands
- All deploy commands can also be done by providing env variables as `aws_access_key_id=somekey aws_secret_access_key=xxxx npm run <deploy_method>`

### First time
`npm run deploy` deploys to AWS with the **dev** stage
`npm run deploy:prod` deploys to AWS with **prod** stage

These commands at the moment, creates:
- Generic Audit Kinesis Stream with the name *stage*-qi-audit-audit-stream, for eg prod it will be `prod-qi-audit-audit-stream`
- Assess Audit Kinesis Stream with the name *stage*-qi-audit-assess-log-stream.
- Central read log Audit Kinesis Stream with the name *stage*-qi-audit-central-read-log-stream.
- Uploads the  Generic stream λ handler function. See [audit-stream.ts](src/handlers/audit-stream.ts).
- Uploads the Assess stream λ handler function. See [assess-stream.ts](src/handlers/assess-stream.ts).
- Upload the Central Read log stream λ handler function. See [central-readlog-stream.ts](src/handlers/central-readlog-stream.ts).

The λ functions that get uploaded are the TS transpiled JS with all the dependencies using imports and other configs in `webpack.config.js`

### Subsequent
This is when we need to update any logic in our processing source ( Lambda ). If the stack was previously created and if you want to re-deploy , call this in order
- `npm run remove` or `npm run remove:prod` for dev or prod
- `npm run deploy` or `npm run deploy:prod` for dev or prod

### Testing
To test the kinesis stream uploading to elasticsearch run
`npm run kinesis_agent_aws` and add a json line at the tail of `/tmp/choose-share/audit-kinesis-agent.log` as mentioned under **Test Publish to Kinesis**.

- The agent uses us-east-2 kinesis stream @ kinesis.us-east-2.amazonaws.com

**Note** , the agent based on aws relies on having the aws creds configured as mentioned in the *Setup*.  It is also possible to override the access and secret key if passed in as env variables as shown here;-
`aws_access_key_id=somekey aws_secret_access_key=xxxx npm run kinesis_agent_aws`

## Setting travis and coveralls badges
1. Sign in to [travis](https://travis-ci.org/) and activate the build for your project.
2. Sign in to [coveralls](https://coveralls.io/) and activate the build for your project.
3. Replace {{github-user-name}}/{{github-app-name}} with your repo details like: "gitrepo/project name".


## References 
 - Project created using [Yeoman TypeScript NodeJS Generator](https://github.com/ospatil/generator-node-typescript#readme)
 - Offline Kinesis inspired from http://blogs.lessthandot.com/index.php/enterprisedev/cloud/serverless-http-kinesis-lambdas-with-offline-development/
 - Diagram prepped from [AWS Draw IO](https://www.draw.io/?splash=0&libs=aws3). Import the [audit log DrawIO XML](doc/arch.draw.io.xml) into the webapp or edit it [here](https://www.draw.io/?splash=0&libs=aws3#Uhttps%3A%2F%2Fraw.githubusercontent.com%2Fpearca%2Fqi-aws-audit-lambda%2Fmaster%2Fdoc%2Farch.draw.io.xml%3Ftoken%3DAEZIUU4ccq0eVMZjZvxqAGy-0WBgiG4mks5bxljowA%253D%253D).
 - [AWS Regions and Endpoints](https://docs.aws.amazon.com/general/latest/gr/rande.html)
