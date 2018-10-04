import { FieldChange } from "./change";


export interface AuditEvent {
    type: string;
    payload: any;
    partitionKey: string;
}


export interface AssessAuditEvent {
    username: string;
    userId: string;
    eventDate:  number;
    eventType: string;
    area: string;
    clientId?: string;
    clientName?: string;
    deviceId: string;
    deviceName: string;
    entity: string;
    bu: string;
    offline: boolean;
    changes?: FieldChange[];
}