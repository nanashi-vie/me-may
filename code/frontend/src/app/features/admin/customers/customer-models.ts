export type CustomerStatus = 'ACTIVE' | 'ARCHIVED';
export interface CustomerWrite {
 fullName:string; phone:string|null; defaultAddress:string|null; zaloName:string|null;
 tiktokId:string|null; threadsId:string|null; note:string|null;
}
export interface CustomerMutation extends CustomerWrite {confirmDuplicatePhone?:boolean;confirmedPhone?:string;}
export interface CustomerSummary {id:string;customerCode:string;fullName:string;phone:string|null;defaultAddress:string|null;status:CustomerStatus;version:number;createdAt:string;}
export interface CustomerDetail extends CustomerSummary {zaloName:string|null;tiktokId:string|null;threadsId:string|null;note:string|null;createdBy:string|null;updatedAt:string;}
export interface DuplicateSummary {id:string;customerCode:string;fullName:string;phone:string;status:CustomerStatus;}
export interface Page<T>{items:T[];page:number;size:number;totalElements:number;totalPages:number;}
export interface CustomerFilter {q:string;status:CustomerStatus|'ALL';page:number;size:number;}
export const emptyCustomer = ():CustomerWrite => ({fullName:'',phone:null,defaultAddress:null,zaloName:null,tiktokId:null,threadsId:null,note:null});
