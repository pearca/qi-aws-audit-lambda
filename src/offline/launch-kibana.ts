import * as http from 'http';
import { spawn } from 'child_process';

let s = setInterval(() => {
    console.log('Checking if Local Elasticsearch is up');
    http.get({
        host: 'localhost',
        port: 9200,
        path: '/'
    }, resp => {
        resp.on('data', () => {
           // ignored
        });
        resp.on('end', () => {
            console.log(`Kibana server launching`);            
            clearInterval(s); 
            const pr = spawn('kibana');
            pr.stdout.on('data', data => {
                console.log(data.toString()); 
            });
            pr.stderr.on('data', data => {
                console.log(data.toString()); 
            });
            console.log("Kibana server running");            
        });
    })
        .on('error', err => console.log(`Kinesis Not yet!`)).end();
}, 2000);