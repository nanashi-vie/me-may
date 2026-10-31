import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { AdminHttp } from '../../../core/auth/admin-http';
import { ImportOptions,ImportPreview,ImportReceipt } from './book-import-models';
@Injectable({providedIn:'root'})
export class BookImportApi {
  private readonly http=inject(AdminHttp);
  preview(file:File){const body=new FormData();body.set('file',file);return this.http.mutate<ImportPreview>('POST','/book-imports/preview',body);}
  confirm(file:File,fingerprint:string){const body=new FormData();body.set('file',file);body.set('fingerprint',fingerprint);return this.http.mutate<ImportReceipt>('POST','/book-imports/confirm',body);}
  options(){return this.http.get<ImportOptions>('/book-imports/options');}
  template(format:'csv'|'xlsx'){return this.http.download('/book-imports/templates',new HttpParams().set('format',format));}
}
