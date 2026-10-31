import { BookWrite, Taxonomy } from './book.models';
export interface ImportIssue {sheet:string|null;row:number|null;column:string;code:string;message:string;}
export type ImportWrite=Omit<BookWrite,'variants'> & {variants:{id:string|null;name:string|null;stock:number|null}[]};
export interface ImportGroup {key:string;write:ImportWrite;collectionSlugs:string[];rows:number[];}
export interface ImportDocument {groups:ImportGroup[];issues:ImportIssue[];totalIssues:number;rowCount:number;fingerprint:string|null;}
export interface ImportedBook {groupKey:string;id:string;bookCode:string;title:string;}
export interface ImportReceipt {id:string;fingerprint:string;createdAt:string;books:ImportedBook[];}
export interface ImportPreview {document:ImportDocument;receipt:ImportReceipt|null;}
export interface ImportOptions {taxonomy:Taxonomy;collections:{slug:string;name:string}[];}
