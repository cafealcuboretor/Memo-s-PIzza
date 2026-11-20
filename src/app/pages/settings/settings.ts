import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TermsContent } from '../../shared/terms-content/terms-content';
import { DemoCard, DemoCardsService } from '../../services/demo-cards';
import { CartService, DeliveryData } from '../../services/cart';
import { OrdersService, MemosOrder } from '../../services/orders';
import { PrivacyPreferencesService } from '../../services/privacy-preferences';
import { AccountsService, apiErrorMessage } from '../../services/accounts';

interface SessionUser {
  name: string;
  email: string;
  acceptedTermsAt?: string;
}

type AccountTab = 'perfil' | 'ajustes' | 'pagos' | 'direcciones' | 'notificaciones' | 'cookies';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TermsContent],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  private readonly accounts = inject(AccountsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  accountError = '';
  loggingOut = false;
  user: SessionUser | null = null;
  currentTab: AccountTab = 'perfil';
  showTerms = false;
  savedDemoCards: DemoCard[] = [];
  cardNotice = '';
  cookieNotice = '';
  showAddCardForm = false;
  newCardAlias = '';
  newCardHolder = '';
  newCardNumber = '';
  newCardExpiry = '';
  newCardError = '';
  address: DeliveryData | null = null;
  recentOrders: MemosOrder[] = [];
  volume = 0.05;
  rememberVolume = false;
  rememberAddress = false;
  readonly testCards = [
    { label: 'Visa', number: '4242 4242 4242 4242' },
    { label: 'Mastercard', number: '5555 5555 5555 4444' }
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private demoCards: DemoCardsService,
    private cartService: CartService,
    public ordersService: OrdersService,
    private privacy: PrivacyPreferencesService
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const account = await this.accounts.refresh();
      if (this.destroyRef.destroyed) return;
      if (!account) {
        void this.router.navigate(['/login'], { queryParams: { returnUrl: '/ajustes' } });
        return;
      }
      this.user = account;
      this.refreshDemoCards();
      this.address = this.cartService.getDeliveryData();
      this.volume = this.privacy.readAudioVolume();
      this.rememberVolume = !!this.privacy.current?.audioPersonalization;
      this.rememberAddress = !!this.privacy.current?.rememberDelivery;
      await this.ordersService.refresh();
      this.recentOrders = this.ordersService.getOrdersForUser(account.email).slice(0, 5);
    } catch (cause) {
      this.accountError = apiErrorMessage(cause, 'No se pudo cargar tu cuenta.');
    } finally {
      if (!this.destroyRef.destroyed) this.cdr.markForCheck();
    }
  }

  chooseTab(tab: AccountTab): void {
    this.currentTab = tab;
    this.cardNotice = '';
    this.cookieNotice = '';
    if (tab === 'cookies') {
      this.rememberVolume = !!this.privacy.current?.audioPersonalization;
      this.rememberAddress = !!this.privacy.current?.rememberDelivery;
    }
  }

  toggleTerms(): void { this.showTerms = !this.showTerms; }

  savePrivacyOptions(): void {
    this.privacy.save(this.rememberVolume, this.rememberAddress);
    this.cookieNotice = 'Tus preferencias de cookies y almacenamiento se guardaron correctamente.';
  }

  openCookiePreferences(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.dispatchEvent(new Event('memos-open-cookies'));
  }

  changeVolume(event: Event): void {
    this.volume = Math.max(0, Math.min(1, Number((event.target as HTMLInputElement).value) || 0));
    this.privacy.saveAudioVolume(this.volume);
    if (isPlatformBrowser(this.platformId)) {
      document.querySelectorAll<HTMLAudioElement>('audio').forEach(audio => { audio.volume = this.volume; });
    }
  }

  private refreshDemoCards(): void {
    this.savedDemoCards = this.user ? this.demoCards.listForUser(this.user.email) : [];
  }

  toggleAddCardForm(): void {
    this.showAddCardForm = !this.showAddCardForm;
    this.newCardError = '';
    if (!this.showAddCardForm) this.clearNewCardForm();
  }

  private clearNewCardForm(): void {
    this.newCardAlias = '';
    this.newCardHolder = '';
    this.newCardNumber = '';
    this.newCardExpiry = '';
    this.newCardError = '';
  }

  chooseTestCard(number: string): void {
    // Únicamente se aceptan números de prueba aprobados para esta demostración.
    this.newCardNumber = number;
    this.newCardError = '';
  }

  formatNewCardNumber(): void {
    const digits = this.newCardNumber.replace(/\D/g, '').slice(0, 16);
    this.newCardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
    this.newCardError = '';
  }

  formatNewCardExpiry(): void {
    const digits = this.newCardExpiry.replace(/\D/g, '').slice(0, 4);
    this.newCardExpiry = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    this.newCardError = '';
  }

  private hasValidExpiry(expiry: string): boolean {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry);
    if (!match) return false;
    return new Date(2000 + Number(match[2]), Number(match[1])) > new Date();
  }

  saveNewDemoCard(): void {
    if (!this.user) return;
    const holder = this.newCardHolder.trim();
    const cleanNumber = this.newCardNumber.replace(/\D/g, '');
    const testNumber = this.testCards.find(item => item.number.replace(/\D/g, '') === cleanNumber);

    if (holder.length < 3) {
      this.newCardError = 'Ingresa el nombre del titular (mínimo 3 caracteres).';
      return;
    }
    if (!testNumber) {
      this.newCardError = 'Selecciona una de las dos tarjetas de prueba disponibles. No introduzcas datos bancarios reales.';
      this.newCardNumber = '';
      return;
    }
    if (!this.hasValidExpiry(this.newCardExpiry)) {
      this.newCardError = 'Escribe una fecha de vencimiento futura con formato MM/AA.';
      return;
    }

    const saved = this.demoCards.saveForUser(this.user.email, {
      nickname: this.newCardAlias.trim() || testNumber.label,
      holder,
      brand: testNumber.label === 'Visa' ? 'Visa de prueba' : 'Mastercard de prueba',
      last4: cleanNumber.slice(-4),
      expiry: this.newCardExpiry
    });

    if (!saved) {
      this.newCardError = 'No se pudo guardar la tarjeta. Revisa si ya alcanzaste el límite o si el navegador bloquea el almacenamiento.';
      return;
    }

    this.refreshDemoCards();
    this.cardNotice = 'Tarjeta guardada correctamente.';
    this.showAddCardForm = false;
    this.clearNewCardForm();
  }

  removeDemoCard(id: string): void {
    if (!this.user) return;
    this.demoCards.removeForUser(this.user.email, id);
    this.refreshDemoCards();
    this.cardNotice = 'Tarjeta eliminada correctamente.';
  }

  removeAllDemoCards(): void {
    if (!this.user) return;
    this.demoCards.clearForUser(this.user.email);
    this.refreshDemoCards();
    this.cardNotice = 'Se eliminaron las tarjetas guardadas.';
  }

  get pendingOrders(): number {
    return this.recentOrders.filter(order => {
      const status = this.ordersService.getEffectiveStatus(order);
      return status !== 'entregado' && status !== 'cancelado';
    }).length;
  }

  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.accountError = '';
    try {
      await this.accounts.logout();
      this.user = null;
      this.recentOrders = [];
      this.cartService.clearDeliveryData();
      void this.router.navigate(['/']);
    } catch (cause) {
      this.accountError = apiErrorMessage(cause, 'No se pudo cerrar la sesión. Intenta de nuevo.');
    } finally {
      this.loggingOut = false;
      if (!this.destroyRef.destroyed) this.cdr.markForCheck();
    }
  }
}
