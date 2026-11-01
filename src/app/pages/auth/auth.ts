import { ChangeDetectorRef, Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TermsContent } from '../../shared/terms-content/terms-content';

/**
 * Demo SIN base de datos: las cuentas se conservan únicamente en la sesión de esta pestaña.
 * Las contraseñas no se guardan en texto plano: se verifica una derivación PBKDF2 local.
 * Esto NO sustituye un servicio de autenticación real ni protege contra la manipulación
 * del almacenamiento por el propio navegador.
 */
interface MemosUser {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: string;
}

interface PendingRegistration {
  name: string;
  email: string;
  password: string; // Solo en memoria hasta aceptar los términos; nunca se guarda así.
}

interface LegacyUser {
  name: string;
  email: string;
  password: string;
  acceptedTermsVersion?: string;
  acceptedTermsAt?: string;
}

const TERMS_VERSION = '1.0-2026-10-29';
const TEMP_USERS_KEY = 'memos_temp_users_v1';
const CURRENT_SESSION_KEY = 'memos_current_user';
const PBKDF2_ITERATIONS = 120_000;

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TermsContent],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  isLoginMode = true;

  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loginSuccess = '';

  regName = '';
  regEmail = '';
  regPassword = '';
  regConfirmPassword = '';
  regError = '';

  showTermsModal = false;
  acceptedTerms = false;
  pendingAction: 'register' | 'login' = 'register';
  pendingRegistration: PendingRegistration | null = null;
  pendingExistingUser: MemosUser | null = null;
  modalError = '';
  isSavingTerms = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  switchMode(login: boolean): void {
    this.isLoginMode = login;
    this.loginError = '';
    this.loginSuccess = '';
    this.regError = '';
    this.closeTermsModal();
    this.cdr.markForCheck();
  }

  private readUsers(): MemosUser[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const users: unknown = JSON.parse(sessionStorage.getItem(TEMP_USERS_KEY) || '[]');
      return Array.isArray(users) ? users as MemosUser[] : [];
    } catch { return []; }
  }

  private saveUsers(users: MemosUser[]): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(TEMP_USERS_KEY, JSON.stringify(users));
    }
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  private hexToBytes(value: string): Uint8Array<ArrayBuffer> {
    if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('Datos de cuenta inválidos.');
    const bytes = new Uint8Array(value.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  private async derivePasswordHash(password: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
    // Web Crypto funciona en localhost o en un sitio servido por HTTPS.
    if (!crypto?.subtle) throw new Error('Abre la tienda en localhost o con HTTPS para registrar cuentas.');
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      key, 256
    );
    return this.bytesToHex(new Uint8Array(bits));
  }

  private async buildUser(data: PendingRegistration, previous?: LegacyUser): Promise<MemosUser> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordSalt: this.bytesToHex(salt),
      passwordHash: await this.derivePasswordHash(data.password, salt),
      acceptedTermsVersion: previous?.acceptedTermsVersion,
      acceptedTermsAt: previous?.acceptedTermsAt
    };
  }

  /**
   * Migra las cuentas de la versión anterior, que estaban en localStorage sin cifrar,
   * a almacenamiento temporal con derivación de contraseña. No deja sesión iniciada.
   */
  private migrationInProgress: Promise<void> | null = null;
  private migrateLegacyUsers(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve();
    if (this.migrationInProgress) return this.migrationInProgress;
    this.migrationInProgress = this.doMigrateLegacyUsers().finally(() => {
      this.migrationInProgress = null;
    });
    return this.migrationInProgress;
  }

  private async doMigrateLegacyUsers(): Promise<void> {
    const oldData = localStorage.getItem('memos_users');
    // El inicio de sesión anterior no debe mantenerse automáticamente en esta versión.
    localStorage.removeItem(CURRENT_SESSION_KEY);
    if (!oldData) return;

    let oldUsers: LegacyUser[];
    try {
      const parsed: unknown = JSON.parse(oldData);
      if (!Array.isArray(parsed)) return;
      oldUsers = parsed as LegacyUser[];
    } catch { return; }

    const users = this.readUsers();
    for (const old of oldUsers) {
      if (typeof old?.password !== 'string' || typeof old?.email !== 'string' ||
          typeof old?.name !== 'string') continue;
      if (users.some(u => u.email === old.email.toLowerCase())) continue;
      users.push(await this.buildUser({ name: old.name, email: old.email, password: old.password }, old));
    }
    // Solo borramos los registros antiguos si la nueva copia se guardó correctamente.
    this.saveUsers(users);
    localStorage.removeItem('memos_users');
  }

  async onRegister(): Promise<void> {
    this.regError = '';
    const name = this.regName.trim();
    const email = this.regEmail.trim().toLowerCase();

    if (!name || !email || !this.regPassword || !this.regConfirmPassword) {
      this.regError = 'Completa todos los campos obligatorios.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.regError = 'Escribe un correo electrónico válido.';
      return;
    }
    if (this.regPassword.length < 6) {
      this.regError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.regPassword !== this.regConfirmPassword) {
      this.regError = 'Las contraseñas no coinciden.';
      return;
    }
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await this.migrateLegacyUsers();
      if (this.readUsers().some(u => u.email === email)) {
        this.regError = 'Este correo ya está registrado en esta sesión.';
        return;
      }
      this.pendingAction = 'register';
      this.pendingRegistration = { name, email, password: this.regPassword };
      this.pendingExistingUser = null;
      this.acceptedTerms = false;
      this.modalError = '';
      this.showTermsModal = true;
    } catch {
      this.regError = 'No fue posible preparar el registro temporal. Intenta nuevamente.';
    } finally {
      // Angular 22 usa Zoneless: los cambios tras un await requieren notificar a la vista.
      this.cdr.markForCheck();
    }
  }

  async onLogin(): Promise<void> {
    this.loginError = '';
    this.loginSuccess = '';
    if (!this.loginEmail.trim() || !this.loginPassword) {
      this.loginError = 'Ingresa tu correo y contraseña.';
      return;
    }
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      await this.migrateLegacyUsers();
      const email = this.loginEmail.trim().toLowerCase();
      const user = this.readUsers().find(u => u.email === email);
      if (!user || !user.passwordHash || !user.passwordSalt ||
          await this.derivePasswordHash(this.loginPassword, this.hexToBytes(user.passwordSalt)) !== user.passwordHash) {
        this.loginError = 'Credenciales inválidas o registro temporal no encontrado. Recuerda que se elimina al cerrar la pestaña.';
        return;
      }
      if (user.acceptedTermsVersion !== TERMS_VERSION) {
        // Las cuentas antiguas deberán aceptar esta versión una sola vez.
        this.pendingAction = 'login';
        this.pendingExistingUser = user;
        this.pendingRegistration = null;
        this.acceptedTerms = false;
        this.modalError = '';
        this.showTermsModal = true;
        return;
      }
      this.startSession(user);
    } catch {
      this.loginError = 'No fue posible comprobar tus credenciales locales. Intenta nuevamente.';
    } finally {
      this.cdr.markForCheck();
    }
  }

  closeTermsModal(): void {
    this.showTermsModal = false;
    this.acceptedTerms = false;
    this.pendingRegistration = null;
    this.pendingExistingUser = null;
    this.modalError = '';
    this.cdr.markForCheck();
  }

  async acceptAndContinue(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.acceptedTerms || this.isSavingTerms) return;
    this.isSavingTerms = true;
    this.modalError = '';
    this.cdr.markForCheck(); // Mostrar el estado de guardado de inmediato.
    try {
      const users = this.readUsers();
      let user: MemosUser;
      if (this.pendingAction === 'register') {
        if (!this.pendingRegistration) return;
        const pending = this.pendingRegistration;
        if (users.some(u => u.email === pending.email)) {
          this.modalError = 'Este correo ya está registrado.';
          return;
        }
        user = await this.buildUser(pending);
        user.acceptedTermsVersion = TERMS_VERSION;
        user.acceptedTermsAt = new Date().toISOString();
        users.push(user);
      } else {
        if (!this.pendingExistingUser) return;
        user = {
          ...this.pendingExistingUser,
          acceptedTermsVersion: TERMS_VERSION,
          acceptedTermsAt: new Date().toISOString()
        };
        const index = users.findIndex(u => u.email === user.email);
        if (index < 0) {
          this.modalError = 'La cuenta temporal ya no está disponible.';
          return;
        }
        users[index] = user;
      }
      this.saveUsers(users);
      const wasRegistering = this.pendingAction === 'register';
      this.closeTermsModal();
      if (wasRegistering) {
        // Una vez completado el registro, mostrar inmediatamente Iniciar Sesión sin autenticar al usuario.
        sessionStorage.removeItem(CURRENT_SESSION_KEY);
        localStorage.removeItem(CURRENT_SESSION_KEY);
        this.regName = '';
        this.regEmail = '';
        this.regPassword = '';
        this.regConfirmPassword = '';
        this.switchMode(true);
        this.loginEmail = user.email; // Solo el correo: el cliente escribe su contraseña.
        this.loginPassword = '';
        this.loginSuccess = '¡Te has registrado correctamente!';
      } else {
        this.startSession(user);
      }
    } catch {
      this.modalError = 'No se pudo guardar la cuenta temporal. Revisa el acceso al almacenamiento del navegador.';
    } finally {
      this.isSavingTerms = false;
      // CRÍTICO: al finalizar PBKDF2/Storage, actualizar la vista para cerrar el modal
      // y mostrar inmediatamente el formulario Iniciar Sesión.
      this.cdr.markForCheck();
    }
  }

  private startSession(user: MemosUser): void {
    // Solo sesión de navegador. Nunca almacena la contraseña en una sesión activa.
    const { name, email, acceptedTermsVersion, acceptedTermsAt } = user;
    localStorage.removeItem(CURRENT_SESSION_KEY);
    sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({
      name, email, acceptedTermsVersion, acceptedTermsAt
    }));
    this.loginPassword = '';
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl === '/carrito' ? '/carrito' : '/');
  }
}
