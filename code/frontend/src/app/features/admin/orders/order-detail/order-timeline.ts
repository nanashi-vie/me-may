import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrderDetail } from '../order-models';
import { timeline } from './order-detail-view';

/** Milestones of one order, from creation to handover, cancellation or return. */
@Component({
  selector: 'app-order-timeline',
  imports: [DatePipe],
  templateUrl: './order-timeline.html',
  styleUrl: './order-timeline.scss',
})
export class OrderTimeline {
  readonly order = input.required<OrderDetail>();
  readonly steps = computed(() => timeline(this.order()));
  readonly current = computed(() => this.steps().reduce((last, s, i) => (s.done ? i : last), -1));
}
