import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
  volumeText = '5%';
  cartCount = 0;
  isLoggedIn = false;
  userName = '';
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cartService: CartService,
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

  toggleMusic(event: any) {
    if (isPlatformBrowser(this.platformId)) {
      const isChecked = event.target.checked;
      const audios = document.querySelectorAll('audio');
      
      const slider = document.getElementById('volumeSlider') as HTMLInputElement;
      const currentVolume = slider ? parseFloat(slider.value) : 0.05;
      
      audios.forEach(audio => {
        if (!isChecked) {
          audio.muted = true;
          audio.pause();
          audio.setAttribute('data-user-muted', 'true');
        } else {
          audio.muted = false;
          audio.volume = currentVolume;
          audio.removeAttribute('data-user-muted');
          audio.play().catch(() => {});
        }
      });
    }
  }

  changeVolume(event: any) {
    if (isPlatformBrowser(this.platformId)) {
      const newVolume = parseFloat(event.target.value);
      this.volumeText = Math.round(newVolume * 100) + '%';
      
      const audios = document.querySelectorAll('audio');
      audios.forEach(audio => {
        audio.volume = newVolume;
      });
    }
  }
}