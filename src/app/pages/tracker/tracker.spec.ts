import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Tracker } from './tracker';

describe('Tracker', () => {
  let component: Tracker;
  let fixture: ComponentFixture<Tracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tracker],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(Tracker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
