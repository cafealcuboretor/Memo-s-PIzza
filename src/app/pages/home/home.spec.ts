import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Inicio interactivo de Memo\'s Pizza', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('muestra seis publicaciones positivas de la gaceta', () => {
    expect(component.articles.length).toBe(6);
    expect(component.articles.every(article => article.image && article.headline && article.promoLabel)).toBe(true);
  });

  it('abre y cierra un periódico', () => {
    component.openArticle(component.articles[0]);
    expect(component.selectedArticle?.id).toBe(1);
    component.closeArticle();
    expect(component.selectedArticle).toBeNull();
  });

  it('permite cambiar la iluminación del escenario', () => {
    expect(component.stageLightsOn).toBe(true);
    component.toggleStageLights();
    expect(component.stageLightsOn).toBe(false);
  });

  it('conecta los anuncios con Promociones', () => {
    expect(fixture.nativeElement.querySelectorAll('.gazette-mini-promo').length).toBe(6);
  });
});
