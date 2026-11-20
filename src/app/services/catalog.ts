import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';

export interface CatalogProduct {
  id: string;
  name: string;
  category: 'pizzas' | 'bebidas' | 'postres' | 'promociones';
  description: string;
  price: number;
  emoji: string;
  image: string;
  tag?: string;
  badgeText?: string;
  badgeColor?: string;
}

type ApiProduct = Omit<CatalogProduct, 'price'> & { priceCents: number };

interface CatalogPage {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly catalog = signal<CatalogProduct[]>([]);
  private readonly loadStatus = signal<'loading' | 'ready' | 'error'>('loading');
  private loading = false;

  readonly products = this.catalog.asReadonly();
  readonly status = this.loadStatus.asReadonly();

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.loadStatus.set('loading');

    const loadPage = (page: number) => this.http.get<CatalogPage>('/api/products', {
      params: { page, limit: 100 },
      timeout: 8000,
    });

    loadPage(1).pipe(
      expand(result => result.page * result.limit < result.total ? loadPage(result.page + 1) : EMPTY),
      reduce((products, result) => products.concat(result.items), [] as ApiProduct[]),
      map(items => items.map(({ priceCents, ...item }) => ({ ...item, price: priceCents / 100 }))),
    ).subscribe({
      next: products => {
        this.catalog.set(products);
        this.loadStatus.set('ready');
        this.loading = false;
      },
      error: () => {
        this.loadStatus.set('error');
        this.loading = false;
      },
    });
  }
}
