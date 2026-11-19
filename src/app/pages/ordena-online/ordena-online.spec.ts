import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrdenaOnline } from './ordena-online';

describe('OrdenaOnline', () => {
  let component: OrdenaOnline;
  let fixture: ComponentFixture<OrdenaOnline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdenaOnline],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdenaOnline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
