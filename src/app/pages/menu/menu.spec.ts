import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartService } from '../../services/cart';
import { Menu } from './menu';

describe('Menu', () => {
  let component: Menu;
  let fixture: ComponentFixture<Menu>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menu],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Menu);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga el menú mediante la API y envía al carrito el precio en pesos', async () => {
    fixture.detectChanges();
    http.expectOne(req => req.url === '/api/products').flush({
      items: [
        { id: 'pizza-prueba', name: 'Pizza de prueba', category: 'pizzas', priceCents: 18750, description: '', emoji: '', image: '' },
        { id: 'promo-prueba', name: 'Promo de prueba', category: 'promociones', priceCents: 25000, description: '', emoji: '', image: '' },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    await fixture.whenStable();

    expect(component.filteredItems.map(item => item.name)).toEqual(['Pizza de prueba']);
    expect(component.filteredItems[0].price).toBe(187.5);
    const cart = TestBed.inject(CartService);
    cart.clearCart();
    try {
      component.addToCart(component.filteredItems[0]);
      expect(cart.getSubtotal()).toBe(187.5);
    } finally {
      cart.clearCart();
    }
  });

  it('permite reintentar si el catálogo no respondió', async () => {
    fixture.detectChanges();
    http.expectOne(req => req.url === '/api/products').flush(
      { code: 'CATALOG_UNAVAILABLE' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await fixture.whenStable();
    expect(component.catalogStatus()).toBe('error');

    component.loadCatalog();
    http.expectOne(req => req.url === '/api/products').flush({ items: [], total: 0, page: 1, limit: 100 });
    await fixture.whenStable();
    expect(component.catalogStatus()).toBe('ready');
  });
});
