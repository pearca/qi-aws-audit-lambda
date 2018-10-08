import { Client } from "elasticsearch";
import { AssessAuditEvent, AuditEvent } from "@audit/models/event";

export class ESClient {

    private client: Client;


    constructor(private index: string, private type: string) {
        this.client = new Client({
            host: process.env.ELASTIC_SEARCH_HOST,
            log: process.env.ELASTIC_CLIENT_LOG || 'error'
        });
    }

    public processAssessLogs(logs: AssessAuditEvent[]): void {

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
        this.createIndex(JSON.parse(mapping), () => {
            logs.forEach(l => this.addIndex(l));
        });

    }

    private createIndex(mappings: any, callback: () => void): void {
        this.client.indices.exists({
            index: this.index
        }).then((exists: boolean) => {
            if (exists === false) {
                return this.client.indices.create({
                    index: this.index,
                    body: {
                        mappings
                    }
                }).then(() => {
                    return true;
                })
            } else {
                return true;
            }
        }).then((status: any) => {
            callback();
        }).catch((err: any) => {
            console.error(`Error in creating and/or checking index for ${this.index}`);
        });
    }

    private addIndex(log: any): void {
        this.client.index({
            index: this.index,
            type: this.type,
            body: log
        }, (err: any, resp: any) => {
            console.warn(err, resp);
        });
    }
}