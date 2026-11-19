import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationStart, RouterOutlet, RouterLink } from '@angular/router';
import { Header } from './shared/header/header';
import { Footer } from './shared/footer/footer';
import { NotificationService } from './services/notification';
import { PrivacyPreferencesService } from './services/privacy-preferences';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  title = 'tienda-virtual';
  isOffline = false;
  offlineMessage = 'Tu conexión a internet se interrumpió.';
  isAnimating = true;
  hasCookieDecision = false;
  cookieSettingsOpen = false;
  choiceAudio = false;
  choiceAddress = false;
  locationPromptVisible = false;
  locationStatus: 'idle' | 'requesting' | 'granted' | 'error' = 'idle';
  locationMessage = '';
  // Solo se retienen las coordenadas en memoria; no se convierten por sí solas en una dirección postal.
  private selectedCoordinates: { latitude: number; longitude: number } | null = null;
  public notificationService = inject(NotificationService);
  public privacy = inject(PrivacyPreferencesService);

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.router.events.subscribe((event: unknown) => {
      if (event instanceof NavigationStart) {
        this.isAnimating = true;
        setTimeout(() => { this.isAnimating = false; this.cdr.markForCheck(); }, 1100);
      }
    });
  }

  get showLocationPrompt(): boolean {
    return this.hasCookieDecision && !this.cookieSettingsOpen && this.locationPromptVisible;
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isOffline = !navigator.onLine;
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('online', this.handleOnline);
    const choice = this.privacy.current;
    this.hasCookieDecision = !!choice;
    this.choiceAudio = !!choice?.audioPersonalization;
    this.choiceAddress = !!choice?.rememberDelivery;
    // El aviso de ubicación aparece DESPUÉS de decidir las preferencias; así no se superponen.
    this.locationPromptVisible = !sessionStorage.getItem('memos_location_prompt_answer');
    window.addEventListener('memos-open-cookies', this.reopenCookies);
    const audio = document.getElementById('global-music') as HTMLAudioElement | null;
    if (audio) audio.volume = this.privacy.readAudioVolume();
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('memos-open-cookies', this.reopenCookies);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('online', this.handleOnline);
    }
  }

  private handleOffline = () => {
    this.isOffline = true;
    this.offlineMessage = 'Tu conexión a internet se interrumpió.';
    this.cdr.markForCheck();
  };

  private handleOnline = () => {
    this.isOffline = false;
    this.offlineMessage = '';
    this.cdr.markForCheck();
  };

  retryConnection(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (navigator.onLine) {
      this.isOffline = false;
      this.offlineMessage = '';
    } else {
      this.offlineMessage = 'Todavía no hay conexión. Revisa tu red e inténtalo otra vez.';
    }
    this.cdr.markForCheck();
  }

  private reopenCookies = () => {
    this.choiceAudio = !!this.privacy.current?.audioPersonalization;
    this.choiceAddress = !!this.privacy.current?.rememberDelivery;
    this.cookieSettingsOpen = true;
    this.cdr.markForCheck();
  };

  openCookieSettings(): void { this.reopenCookies(); }
  closeCookieSettings(): void { this.cookieSettingsOpen = false; this.cdr.markForCheck(); }

  toggleCookiePreference(name: 'audio' | 'address', event: Event): void {
    const active = (event.target as HTMLInputElement).checked;
    if (name === 'audio') this.choiceAudio = active;
    if (name === 'address') this.choiceAddress = active;
  }

  private saveCookies(audio: boolean, address: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.privacy.save(audio, address);
    this.choiceAudio = audio;
    this.choiceAddress = address;
    this.hasCookieDecision = true;
    this.cookieSettingsOpen = false;
    const globalMusic = document.getElementById('global-music') as HTMLAudioElement | null;
    if (globalMusic && audio) globalMusic.volume = this.privacy.readAudioVolume();
    this.cdr.markForCheck();
  }

  acceptNecessary(): void { this.saveCookies(false, false); }
  acceptAll(): void { this.saveCookies(true, true); }
  saveSelectedCookies(): void { this.saveCookies(this.choiceAudio, this.choiceAddress); }

  declineLocation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.setItem('memos_location_prompt_answer', 'declined');
    this.selectedCoordinates = null;
    this.locationPromptVisible = false;
    this.locationStatus = 'idle';
    this.cdr.markForCheck();
  }

  requestLocation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!navigator.geolocation) {
      this.locationStatus = 'error';
      this.locationMessage = 'Tu navegador no admite geolocalización. Puedes introducir tu dirección manualmente.';
      this.cdr.markForCheck(); return;
    }
    this.locationStatus = 'requesting';
    this.locationMessage = 'Esperando permiso del navegador…';
    this.cdr.markForCheck();
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.selectedCoordinates = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        this.locationStatus = 'granted';
        this.locationMessage = 'Ubicación obtenida de forma temporal. No equivale a una dirección postal: escríbela al pedir a domicilio.';
        sessionStorage.setItem('memos_location_prompt_answer', 'allowed');
        this.cdr.markForCheck();
      },
      error => {
        this.locationStatus = 'error';
        this.locationMessage = error.code === 1 ? 'Permiso rechazado. Puedes continuar sin compartir tu ubicación.' : 'No pudimos obtener la ubicación. Introduce tu dirección manualmente.';
        if (error.code === 1) sessionStorage.setItem('memos_location_prompt_answer', 'declined');
        this.cdr.markForCheck();
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  }

  dismissLocation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.setItem('memos_location_prompt_answer', this.locationStatus === 'granted' ? 'allowed' : 'declined');
    this.locationPromptVisible = false;
    this.cdr.markForCheck();
  }
}
