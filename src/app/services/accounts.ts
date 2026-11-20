import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Account {
  id: string;
  name: string;
  email: string;
  role: 'cliente' | 'admin';
  acceptedTermsVersion: string;
  acceptedTermsAt: string;
}

export const TERMS_VERSION = '1.1-2026-11-20';
export const WRITE_HEADERS = { 'X-Memos-Request': '1' };
const OPTIONS = { headers: WRITE_HEADERS, timeout: 8000 };

export function apiErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof HttpErrorResponse && typeof cause.error?.message === 'string') {
    return cause.error.message;
  }
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly http = inject(HttpClient);
  private readonly profile = signal<Account | null>(null);
  private pending?: Promise<Account | null>;
  private revision = 0;
  readonly user = this.profile.asReadonly();

  refresh(): Promise<Account | null> {
    if (this.pending) return this.pending;
    const revision = this.revision;
    this.pending = firstValueFrom(this.http.get<{ account: Account }>('/api/auth/me', {
      transferCache: false, timeout: 8000
    })).then(({ account }) => {
      if (revision === this.revision) this.profile.set(account);
      return this.profile();
    }).catch(cause => {
      if (revision !== this.revision) return this.profile();
      if (cause instanceof HttpErrorResponse && cause.status === 401) {
        this.profile.set(null);
        return null;
      }
      throw cause;
    }).finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/register', { name, email, password, termsVersion: TERMS_VERSION }, OPTIONS));
  }

  async login(email: string, password: string, accepted = false): Promise<void> {
    const { account } = await firstValueFrom(this.http.post<{ account: Account }>('/api/auth/login', {
      email, password, termsVersion: accepted ? TERMS_VERSION : undefined
    }, OPTIONS));
    this.revision++;
    this.profile.set(account);
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {}, OPTIONS));
    this.revision++;
    this.profile.set(null);
  }
}
