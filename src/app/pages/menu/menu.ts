import { CommonModule } from '@angular/common';
import { Component, afterNextRender, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart';
import { CatalogProduct, CatalogService } from '../../services/catalog';
import { NotificationService } from '../../services/notification';

type MenuFilter = 'todos' | Exclude<CatalogProduct['category'], 'promociones'>;

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  activeFilter: MenuFilter = 'todos';
  searchTerm = '';

  private readonly cartService = inject(CartService);
  private readonly catalogService = inject(CatalogService);
  private readonly notify = inject(NotificationService);

  readonly catalogStatus = this.catalogService.status;

  constructor() {
    afterNextRender(() => this.loadCatalog());
  }

  loadCatalog() {
    this.catalogService.load();
  }

  get filteredItems(): CatalogProduct[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.catalogService.products().filter(item => {
      const matchesCategory = item.category !== 'promociones' &&
        (this.activeFilter === 'todos' || item.category === this.activeFilter);
      const matchesSearch = !term ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }

  setFilter(category: MenuFilter) {
    this.activeFilter = category;
  }

  clearSearch() {
    this.searchTerm = '';
  }

  addToCart(item: CatalogProduct) {
    this.cartService.addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      emoji: item.emoji,
      image: item.image,
      category: item.category,
    });
    this.notify.show(item.name + ' se añadió a tu orden.', 'SUMINISTRO REGISTRADO', 'success');
  }
}
