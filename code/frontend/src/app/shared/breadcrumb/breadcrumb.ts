import { Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string | readonly unknown[];
  queryParams?: Params;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  template: `
    <nav class="breadcrumb" aria-label="Đường dẫn">
      <ol>
        @for (item of items(); track $index; let last = $last) {
          <li [class.current]="last">
            @if (item.link && !last) {
              <a [routerLink]="item.link" [queryParams]="item.queryParams">{{ item.label }}</a>
            } @else {
              <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
            }
            @if (!last) {
              <span class="sep" aria-hidden="true">/</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    .breadcrumb {
      margin: 1.35rem 0 1.45rem;
      font-size: 0.9rem;
      line-height: 1.45;
      color: var(--muted);
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 0;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      display: inline-flex;
      align-items: center;
      min-width: 0;
    }
    a {
      color: var(--ink);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.14s ease;
    }
    a:hover,
    a:focus-visible {
      color: var(--red);
    }
    .sep {
      margin-inline: 0.65rem;
      color: var(--muted);
      user-select: none;
    }
    li.current {
      color: var(--muted);
      max-width: 100%;
    }
    li.current span {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (max-width: 720px) {
      .breadcrumb {
        margin: 1rem 0 1.15rem;
        font-size: 0.84rem;
      }
      .sep {
        margin-inline: 0.45rem;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      a {
        transition: none;
      }
    }
  `,
})
export class Breadcrumb {
  readonly items = input.required<readonly BreadcrumbItem[]>();
}
