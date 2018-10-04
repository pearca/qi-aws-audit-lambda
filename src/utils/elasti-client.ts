import { Client } from "elasticsearch";
import { AssessAuditEvent } from "@audit/models/event";


//let indexExistsCheck: boolean = false;
export class ESClient {
    
    private client: Client;
     
    
    constructor(private index: string, private type: string) {
        this.client = new Client({
            host: process.env.ELASTIC_SEARCH_HOST,
            log: process.env.ELASTIC_CLIENT_LOG || 'error'
        });        
    }

    public processAssessLogs(logs: AssessAuditEvent[]): void {
       // if (!indexExistsCheck) {
            const mapping = `
                    {
                        "${this.type}": {
                            "properties": {
                                "eventDate": {
                                    "type":   "date",
                                    "format": "yyyyMMdd'T'HHmmssZ"
                                }
                            }
                        }
                    }
                `;
            

            this.client.indices.exists({
                index: this.index
            }).then((exists:boolean) => {
                if (exists === false) {
                    return this.client.indices.create({
                        index: this.index,
                        body: {
                            mappings: JSON.parse(mapping)
                        }
                    }).then (() => {
                        return true;
                    })
                } else {
                    return true;
                } 
            }).then((status:any) => {
                //indexExistsCheck = true;
                this.postLogs(logs);  
            })
            .catch((err: any) => {               
                console.error(`Error in creating and/or checking index for ${this.index}`);
            });            
       /* } else {
            this.postLogs(logs);
        }*/
    }

    private postLogs(logs: AssessAuditEvent[]): void {
        logs.forEach (l => {
            this.client.index({
                index: this.index,
                type: this.type,
                body: l
            }, (err:any, resp:any) => {
                console.warn(err, resp);
            });
        });       
    }
}