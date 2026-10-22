import { Component,computed,inject,signal } from '@angular/core';
import { ActivatedRoute,RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { BookApi } from './book-api';
import { PreviewBook } from './book.models';
import { AGE_LABELS,PRICE_NOTE,READING_LABELS,READING_NOTE } from './book-copy';
import { PageMetadata } from '../../../core/page-metadata';
@Component({selector:'app-book-preview',imports:[RouterLink,DecimalPipe],templateUrl:'./book-preview.html',styleUrl:'./book-preview.scss'})
export class BookPreview {
 private readonly api=inject(BookApi);private readonly route=inject(ActivatedRoute);readonly book=signal<PreviewBook|null>(null);readonly error=signal('');readonly priceNote=PRICE_NOTE;readonly readingNote=READING_NOTE;readonly readingLabels=READING_LABELS;
 readonly title=computed(()=>{const b=this.book();return b?[b.title,b.publisher,b.author,b.ageGroups?.map(a=>AGE_LABELS[a]).join(', ')].filter(Boolean).join(' | '):'';});
 readonly incomplete=computed(()=>{const b=this.book();return !b||!b.title||!b.categoryCode||!b.priceVnd||!b.conditionNote||(b.categoryCode==='PICTURE_BOOK'&&!b.binding)||b.media.length!==3;});
 constructor(){inject(PageMetadata).admin('Xem trước sách | Mẹ Mây');}
 bookId(){return this.route.snapshot.paramMap.get("id");}
 ages(){return this.book()?.ageGroups.map(a=>AGE_LABELS[a]).join(", ")??"";}
 ngOnInit(){const id=this.route.snapshot.paramMap.get('id');if(id)this.api.preview(id).subscribe({next:b=>this.book.set(b),error:()=>this.error.set('Chưa tải được preview. Kiểm tra phiên đăng nhập và thử lại.')});}
}
