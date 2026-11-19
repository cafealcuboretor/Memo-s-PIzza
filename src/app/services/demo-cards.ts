import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

/**
 * Instrumentos de pago totalmente ficticios para una demostración académica.
 * NUNCA persiste PAN (número completo), CVV/CVC ni datos de un banco real.
 */
export interface DemoCard {
  id: string;
  ownerEmail: string;
  nickname: string;
  holder: string;
  brand: string;
  last4: string;
  expiry: string;
  createdAt: string;
}

const KEY = 'memos_demo_cards_v1';
const MAX_PER_USER = 6;

@Injectable({ providedIn: 'root' })
export class DemoCardsService {
  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  private readAll(): DemoCard[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const result: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(result)) return [];
      return result.filter((row): row is DemoCard =>
        !!row && typeof row === 'object' &&
        typeof row.id === 'string' &&
        typeof row.ownerEmail === 'string' &&
        typeof row.last4 === 'string' &&
        /^\d{4}$/.test(row.last4) &&
        typeof row.holder === 'string' &&
        typeof row.expiry === 'string'
      );
    } catch {
      return [];
    }
  }

  listForUser(email: string): DemoCard[] {
    if (!email) return [];
    return this.readAll().filter(card => card.ownerEmail === email.trim().toLowerCase());
  }

  saveForUser(email: string, card: Pick<DemoCard, 'nickname' | 'holder' | 'brand' | 'last4' | 'expiry'>): boolean {
    if (!isPlatformBrowser(this.platformId) || !email) return false;
    const owner = email.trim().toLowerCase();
    const all = this.readAll();
    const mine = all.filter(entry => entry.ownerEmail === owner);
    const existing = mine.find(entry => entry.last4 === card.last4 && entry.expiry === card.expiry);
    if (!existing && mine.length >= MAX_PER_USER) return false;
    const item: DemoCard = {
      id: existing?.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `demo-${Date.now()}`),
      ownerEmail: owner,
      nickname: card.nickname.trim().slice(0, 28) || `${card.brand} •••• ${card.last4}`,
      holder: card.holder.trim().slice(0, 90),
      brand: card.brand,
      last4: card.last4,
      expiry: card.expiry,
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    const updated = [item, ...all.filter(entry => entry.id !== item.id)];
    try {
      localStorage.setItem(KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }

  removeForUser(email: string, id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const owner = email.trim().toLowerCase();
    const updated = this.readAll().filter(entry => !(entry.ownerEmail === owner && entry.id === id));
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* modo privado/sin espacio */ }
  }

  clearForUser(email: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const owner = email.trim().toLowerCase();
    const updated = this.readAll().filter(entry => entry.ownerEmail !== owner);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* modo privado/sin espacio */ }
  }
}
