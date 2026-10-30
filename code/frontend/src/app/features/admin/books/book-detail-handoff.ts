import { Injectable, effect, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetail } from './book.models';
@Injectable({providedIn:'root'})
export class BookDetailHandoff {
  private readonly auth=inject(AuthService);
  private seed:{book:BookDetail;epoch:number;expires:number}|null=null;
  constructor(){effect(()=>{const epoch=this.auth.epoch();if(this.seed&&this.seed.epoch!==epoch)this.clear();});}
  put(book:BookDetail){this.seed={book,epoch:this.auth.epoch(),expires:Date.now()+10000};}
  take(id:string):BookDetail|null {
    const seed=this.seed;this.clear();
    return seed?.book.id===id && seed.epoch===this.auth.epoch()&&seed.expires>Date.now()?seed.book:null;
  }
  clear(){this.seed=null;}
}
