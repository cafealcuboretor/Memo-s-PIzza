import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Promos } from './promos';

describe('Promos', () => {
  let component: Promos;
  let fixture: ComponentFixture<Promos>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Promos],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Promos);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra las promociones de la API con los importes en pesos', async () => {
    fixture.detectChanges();
    http.expectOne(req => req.url === '/api/products').flush({
      items: [
        { id: 'pizza-prueba', name: 'Pizza de prueba', category: 'pizzas', priceCents: 18500, description: '', emoji: '', image: '' },
        { id: 'promo-prueba', name: 'Promo de prueba', category: 'promociones', priceCents: 28750, description: '', emoji: '', image: '' },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    await fixture.whenStable();

    expect(component.ofertas.map(promo => promo.name)).toEqual(['Promo de prueba']);
    expect(component.ofertas[0].price).toBe(287.5);
  });
});
