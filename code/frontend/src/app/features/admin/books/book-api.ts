import {BookCreate, MediaAssignment, UploadSession, TemporaryMedia} from './book.models';
import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { AdminHttp } from '../../../core/auth/admin-http';
import {
  Availability,
  AuditSummary,
  BookDetail,
  BookFilter,
  BookSummary,
  BookWrite,
  MediaRole,
  Page,
  PreviewBook,
  Publication,
  Taxonomy,
} from './book.models';
@Injectable({ providedIn: 'root' })
export class BookApi {
  private readonly http = inject(AdminHttp);
  list(filter: BookFilter) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter))
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    return this.http.get<Page<BookSummary>>('/books', params);
  }
  get(id: string) {
    return this.http.get<BookDetail>('/books/' + id);
  }
  create(body: BookCreate) {
    return this.http.mutate<BookDetail>('POST', '/books', body);
  }
  update(id: string, version: number, body: BookWrite, media?: MediaAssignment[]) {
    return this.http.mutate<BookDetail>('PUT', '/books/' + id, { ...body, version, ...(media ? {media} : {}) });
  }
  taxonomy() {
    return this.http.get<Taxonomy>('/taxonomy');
  }
  publication(id: string, version: number, status: Publication, confirmedActualCopy = false) {
    return this.http.mutate<BookDetail>('PATCH', `/books/${id}/publication`, {
      version,
      status,
      confirmedActualCopy,
    });
  }
  availability(id: string, version: number, availability: Availability) {
    return this.http.mutate<BookDetail>('PATCH', `/books/${id}/availability`, {
      version,
      availability,
    });
  }
  preview(id: string) {
    return this.http.get<PreviewBook>(`/books/${id}/preview`);
  }
  audit(id: string, page = 0) {
    return this.http.get<Page<AuditSummary>>(
      `/books/${id}/audit`,
      new HttpParams().set('page', page),
    );
  }
  upload(id: string, role: MediaRole, version: number, body: FormData) {
    body.set('version', String(version));
    return this.http.upload<BookDetail>(`/books/${id}/media/${role}`, body);
  }
  updateMedia(
    id: string,
    role: MediaRole,
    version: number,
    alt: string | null,
    sourceRef: string | null,
  ) {
    return this.http.mutate<BookDetail>('PATCH', `/books/${id}/media/${role}`, {
      version,
      alt,
      sourceRef,
    });
  }
  removeMedia(id: string, role: MediaRole, version: number) {
    return this.http.mutate<BookDetail>('DELETE', `/books/${id}/media/${role}?version=${version}`);
  }
  createSession() { return this.http.mutate<UploadSession>('POST','/upload-sessions',{}); }
  cancelSession(id: string) { return this.http.mutate<void>('DELETE','/upload-sessions/'+id); }
  uploadTemporary(id: string, body: FormData, replaceId: string | null, requestKey: string) {
    body.set('requestKey',requestKey); if(replaceId) body.set('replaceId',replaceId);
    return this.http.upload<TemporaryMedia>('/upload-sessions/'+id+'/media',body);
  }
  removeTemporary(session: string, media: string) { return this.http.mutate<void>('DELETE',`/upload-sessions/${session}/media/${media}`); }
  updateTemporaryMetadata(session: string, media: string, alt: string | null, sourceRef: string | null) { return this.http.mutate<TemporaryMedia>('PATCH',`/upload-sessions/${session}/media/${media}`,{alt,sourceRef}); }
}
