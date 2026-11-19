import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

/** Esta tienda actualmente NO coloca cookies HTTP propias: usa Web Storage. */
export interface PrivacyChoices {
  version: 2;
  necessary: true;
  audioPersonalization: boolean;
  rememberDelivery: boolean;
  updatedAt: string;
}

export const PRIVACY_STORAGE_KEY = 'memos_privacy_choices_v2';
export const AUDIO_STORAGE_KEY = 'memos_audio_volume';

@Injectable({ providedIn: 'root' })
export class PrivacyPreferencesService {
  private readonly choicesSubject = new BehaviorSubject<PrivacyChoices | null>(null);
  readonly choices$ = this.choicesSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (!isPlatformBrowser(platformId)) return;
    try {
      const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PrivacyChoices>;
        if (parsed.version === 2 && typeof parsed.audioPersonalization === 'boolean' && typeof parsed.rememberDelivery === 'boolean') {
          this.choicesSubject.next({ version: 2, necessary: true, audioPersonalization: parsed.audioPersonalization, rememberDelivery: parsed.rememberDelivery, updatedAt: String(parsed.updatedAt || '') });
        }
      }
    } catch { /* Si las preferencias están dañadas, se vuelve a pedir consentimiento. */ }
  }

  get current(): PrivacyChoices | null { return this.choicesSubject.value; }

  save(audioPersonalization: boolean, rememberDelivery: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const choices: PrivacyChoices = {
      version: 2, necessary: true, audioPersonalization, rememberDelivery,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(choices));
    // Preferencias antiguas no diferenciaban los usos opcionales: se descartan.
    localStorage.removeItem('memos_cookie_preferences');
    localStorage.removeItem('memos_cookies_decision');
    if (!audioPersonalization) localStorage.removeItem(AUDIO_STORAGE_KEY);
    if (!rememberDelivery) localStorage.removeItem('memos_delivery');
    this.choicesSubject.next(choices);
  }

  readAudioVolume(): number {
    if (!isPlatformBrowser(this.platformId) || !this.current?.audioPersonalization) return 0.05;
    const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (saved === null) return 0.05;
    const value = Number(saved);
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.05;
  }

  saveAudioVolume(volume: number): void {
    if (!isPlatformBrowser(this.platformId) || !this.current?.audioPersonalization) return;
    localStorage.setItem(AUDIO_STORAGE_KEY, String(Math.max(0, Math.min(1, volume))));
  }
}
