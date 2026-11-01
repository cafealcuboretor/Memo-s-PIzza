import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationStart, RouterOutlet, RouterLink } from '@angular/router';
import { Header } from './shared/header/header';
import { Footer } from './shared/footer/footer';
import { NotificationService } from './services/notification';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'tienda-virtual';
  isAnimating = true;
  cookieDecision: string | null = null;

  // Inyección directa para evitar el error NG2003 en el constructor
  public notificationService = inject(NotificationService);

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.router.events.subscribe((event: unknown) => {
      if (event instanceof NavigationStart) {
        this.isAnimating = true;
        setTimeout(() => {
          this.isAnimating = false;
        }, 2500); 
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.cookieDecision = localStorage.getItem('memos_cookies_decision');
      const audio = document.getElementById('global-music') as HTMLAudioElement;
      
      if (audio) {
        audio.volume = 0.05; 
        
        const forcePlay = () => {
          if (audio.paused && audio.getAttribute('data-user-muted') !== 'true') {
            audio.play().catch(() => {});
          }
        };

        setTimeout(() => {
          if (audio.getAttribute('data-user-muted') !== 'true') {
            audio.play().catch(() => {
              console.warn('Autoplay bloqueado. El audio iniciará al hacer clic.');
              window.addEventListener('click', forcePlay, { once: true, capture: true });
            });
          }
        }, 2000);
      }
    }
  }
  chooseCookies(allow: boolean) {
    if (isPlatformBrowser(this.platformId)) {
      this.cookieDecision = allow ? 'accept' : 'reject';
      localStorage.setItem('memos_cookies_decision', this.cookieDecision);
    }
  }

}