import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../services/cart';
import { PrivacyPreferencesService } from '../../services/privacy-preferences';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
  isMusicOn = false;
  cartCount = 0;
  isLoggedIn = false;
  userName = '';
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cartService: CartService,
    private privacy: PrivacyPreferencesService,
    private router: Router,
    private cdr: ChangeDetectorRef // <-- Herramienta para forzar a Angular a actualizar la pantalla
  ) {}

  ngOnInit() {
    this.refreshSession();
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.refreshSession();
        this.cdr.detectChanges();
      }
    });
    this.cartService.cart$.subscribe(items => {
      // Suma las cantidades
      this.cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
      
      // ¡EL TRUCO ESTÁ AQUÍ! Obliga al menú a mostrar el nuevo número instantáneamente
      this.cdr.detectChanges(); 
    });
  }

  private refreshSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const session = JSON.parse(sessionStorage.getItem('memos_current_user') || 'null');
      this.isLoggedIn = !!session?.email;
      this.userName = this.isLoggedIn ? (session.name || 'Mi cuenta') : '';
    } catch {
      this.isLoggedIn = false;
      this.userName = '';
    }
  }

  toggleMusic(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isMusicOn = !this.isMusicOn;
    document.querySelectorAll<HTMLAudioElement>('audio').forEach(audio => {
      if (!this.isMusicOn) {
        audio.pause();
        audio.muted = true;
      } else {
        audio.muted = false;
        audio.volume = this.privacy.readAudioVolume();
        audio.play().catch(() => {
          this.isMusicOn = false;
          this.cdr.markForCheck();
        });
      }
    });
    this.cdr.markForCheck();
  }
}
