import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TermsContent } from '../../shared/terms-content/terms-content';

interface SessionUser {
  name: string;
  email: string;
  acceptedTermsAt?: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, TermsContent],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  user: SessionUser | null = null;
  showTerms = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router
  ) {}

  ngOnInit(): void {
    // La sesión de esta versión es local y solo se revisa en el navegador.
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const stored = sessionStorage.getItem('memos_current_user');
      const parsed = stored ? JSON.parse(stored) as SessionUser : null;
      if (!parsed?.email || !parsed?.name) {
        this.router.navigate(['/login']);
        return;
      }
      this.user = parsed;
    } catch {
      this.router.navigate(['/login']);
    }
  }

  toggleTerms(): void { this.showTerms = !this.showTerms; }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('memos_current_user');
    }
    this.router.navigate(['/']);
  }
}
