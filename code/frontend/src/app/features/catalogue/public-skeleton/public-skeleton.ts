import { Component, input } from '@angular/core';

@Component({
  selector: 'app-public-skeleton',
  templateUrl: './public-skeleton.html',
  styleUrl: './public-skeleton.scss',
})
export class PublicSkeleton {
  readonly layout = input<'cards' | 'catalogue' | 'detail'>('cards');
  readonly label = input('Đang tải sách…');
}
