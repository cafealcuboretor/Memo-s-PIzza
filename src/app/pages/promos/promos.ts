import { CommonModule } from '@angular/common';
import { Component, afterNextRender, inject } from '@angular/core';
import { CartService } from '../../services/cart';
import { CatalogProduct, CatalogService } from '../../services/catalog';

@Component({
  selector: 'app-promos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promos.html',
  styleUrl: './promos.css',
})
export class Promos {
  private readonly cartService = inject(CartService);
  private readonly catalogService = inject(CatalogService);

  readonly catalogStatus = this.catalogService.status;

  constructor() {
    afterNextRender(() => this.loadCatalog());
  }

  loadCatalog() {
    this.catalogService.load();
  }

  get ofertas(): CatalogProduct[] {
    return this.catalogService.products().filter(item => item.category === 'promociones');
  }

  addToCart(promo: CatalogProduct) {
    this.cartService.addItem({
      id: promo.id,
      name: promo.name,
      price: promo.price,
      emoji: promo.emoji,
      image: promo.image,
      category: promo.category,
    });
  }
}
