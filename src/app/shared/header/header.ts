import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef, afterNextRender, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../services/cart';
import { PrivacyPreferencesService } from '../../services/privacy-preferences';
import { AccountsService } from '../../services/accounts';

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
  readonly user = inject(AccountsService).user;
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cartService: CartService,
    private privacy: PrivacyPreferencesService,
    private cdr: ChangeDetectorRef // <-- Herramienta para forzar a Angular a actualizar la pantalla
  ) {
    const accounts = inject(AccountsService);
    afterNextRender(() => { void accounts.refresh().catch(() => undefined); });
  }

  ngOnInit() {
    this.cartService.cart$.subscribe(items => {
      // Suma las cantidades
      this.cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
      
      // ¡EL TRUCO ESTÁ AQUÍ! Obliga al menú a mostrar el nuevo número instantáneamente
      this.cdr.detectChanges(); 
    });
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
