import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem, DeliveryData } from '../../services/cart';
import { NotificationService } from '../../services/notification';
import { MemosOrder, OrdersService, PaymentMethod } from '../../services/orders';
import { DemoCard, DemoCardsService } from '../../services/demo-cards';

interface CurrentSessionUser {
  name: string;
  email: string;
  acceptedTermsVersion?: string;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class Cart implements OnInit {
  cartItems: CartItem[] = [];
  deliveryInfo: DeliveryData | null = null;
  costoEnvio = 35.00;

  private notify = inject(NotificationService);

  showPaymentModal = false;
  showReceiptModal = false;
  paymentMethod: PaymentMethod = 'efectivo';
  isProcessing = false;
  acceptedLegal = false;
  completedOrder: MemosOrder | null = null;

  cardHolder = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  paymentError = '';
  savedCards: DemoCard[] = [];
  selectedSavedCardId = '';
  rememberDemoCard = false;
  cardNickname = '';
  readonly demoNumbers = [
    { label: 'Visa de prueba', digits: '4242 4242 4242 4242' },
    { label: 'Mastercard de prueba', digits: '5555 5555 5555 4444' }
  ];

  constructor(
    private cartService: CartService,
    private ordersService: OrdersService,
    private demoCards: DemoCardsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit() {
    this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
    });

    this.cartService.delivery$.subscribe(delivery => {
      this.deliveryInfo = delivery;
    });
  }

  get subtotal(): number {
    return this.cartService.getSubtotal();
  }

  get total(): number {
    return this.subtotal + (this.cartItems.length > 0 ? this.costoEnvio : 0);
  }

  get totalItems(): number {
    return this.cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }

  get uniqueCategories(): string {
    const categories = [...new Set(this.cartItems.map(item => item.category || 'producto'))];
    return categories.length ? categories.join(' · ') : 'Sin categoría';
  }

  increaseQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.id, 1);
  }

  decreaseQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.id, -1);
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.id);
    this.notify.show(`${item.name} fue retirado del carrito.`, 'PRODUCTO ELIMINADO', 'warning');
  }

  clearCart() {
    this.cartService.clearCart();
    this.notify.show('El carrito ha sido vaciado por completo.', 'REGISTRO LIMPIO', 'warning');
  }

  removeDelivery() {
    this.cartService.clearDeliveryData();
    this.notify.show('Dirección eliminada de la bitácora.', 'BASE DE DATOS', 'warning');
  }

  openPaymentModal() {
    if (!isPlatformBrowser(this.platformId) || !this.hasAcceptedTerms()) {
      this.notify.show('Inicia sesión y acepta los Términos y Condiciones antes de confirmar tu orden.', 'CUENTA REQUERIDA', 'warning');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    if (!this.deliveryInfo) {
      this.notify.show('Por favor registra primero la dirección de entrega antes de pagar.', 'DESTINO NO ENCONTRADO', 'warning');
      return;
    }
    if (!this.cartItems.length) {
      this.notify.show('Tu carrito está vacío.', 'CARRITO VACÍO', 'warning');
      return;
    }
    this.resetPaymentForm();
    const email = this.getCurrentUser()?.email || '';
    this.savedCards = this.demoCards.listForUser(email);
    this.selectedSavedCardId = this.savedCards[0]?.id || '';
    this.showPaymentModal = true;
  }

  private hasAcceptedTerms(): boolean {
    const user = this.getCurrentUser();
    return !!user?.email && user.acceptedTermsVersion === '1.0-2026-10-29';
  }

  private getCurrentUser(): CurrentSessionUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return JSON.parse(sessionStorage.getItem('memos_current_user') || 'null');
    } catch {
      return null;
    }
  }

  closePaymentModal() {
    if (!this.isProcessing) {
      this.showPaymentModal = false;
      this.resetPaymentForm(); // Nunca retener un CVV después de cerrar la terminal.
      this.cdr.markForCheck();
    }
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
    this.paymentError = '';
    if (method === 'efectivo') this.cardCvv = '';
    this.cdr.markForCheck();
  }

  private resetPaymentForm(): void {
    this.acceptedLegal = false;
    this.paymentMethod = 'efectivo';
    this.isProcessing = false;
    this.paymentError = '';
    this.cardHolder = '';
    this.cardNumber = '';
    this.cardExpiry = '';
    this.cardCvv = '';
    this.savedCards = [];
    this.selectedSavedCardId = '';
    this.rememberDemoCard = false;
    this.cardNickname = '';
  }

  get selectedSavedCard(): DemoCard | null {
    return this.savedCards.find(card => card.id === this.selectedSavedCardId) || null;
  }

  chooseSavedCard(cardId: string): void {
    this.selectedSavedCardId = cardId;
    this.paymentError = '';
    this.cardCvv = '';
    this.rememberDemoCard = false;
    this.cdr.markForCheck();
  }

  useNewDemoCard(): void {
    this.chooseSavedCard('');
  }

  removeSavedCard(cardId: string): void {
    const email = this.getCurrentUser()?.email;
    if (!email) return;
    this.demoCards.removeForUser(email, cardId);
    this.savedCards = this.demoCards.listForUser(email);
    if (this.selectedSavedCardId === cardId) this.selectedSavedCardId = this.savedCards[0]?.id || '';
    this.cardCvv = '';
    this.notify.show('La tarjeta se eliminó de tus métodos guardados.', 'TARJETA ELIMINADA', 'success');
    this.cdr.markForCheck();
  }

  useTestNumber(digits: string): void {
    this.selectedSavedCardId = '';
    this.cardNumber = digits;
    this.paymentError = '';
    this.cdr.markForCheck();
  }

  private getCardBrand(digits: string): string {
    if (digits === '4242424242424242') return 'Visa de prueba';
    if (digits === '5555555555554444') return 'Mastercard de prueba';
    return 'Tarjeta de prueba';
  }

  formatCardNumber(): void {
    const digits = this.cardNumber.replace(/\D/g, '').slice(0, 16);
    this.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiry(): void {
    const digits = this.cardExpiry.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      this.cardExpiry = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      this.cardExpiry = digits;
    }
  }

  private validateCardPayment(): boolean {
    if (this.paymentMethod !== 'tarjeta') return true;
    const cleanCvv = this.cardCvv.replace(/\D/g, '');
    if (!/^\d{3,4}$/.test(cleanCvv)) {
      this.paymentError = 'Ingresa el CVV de 3 o 4 dígitos para confirmar el pedido.';
      return false;
    }

    const saved = this.selectedSavedCard;
    if (saved) {
      if (!this.hasValidExpiry(saved.expiry)) {
        this.paymentError = 'La tarjeta seleccionada está vencida. Elige otra o agrega una nueva.';
        return false;
      }
      this.paymentError = '';
      return true;
    }

    const cleanNumber = this.cardNumber.replace(/\D/g, '');
    if (!this.cardHolder.trim()) {
      this.paymentError = 'Ingresa el nombre del titular de la tarjeta.';
      return false;
    }
    // Solo los patrones de prueba predefinidos son aceptados. Ningún número real se procesa.
    if (!this.demoNumbers.some(test => test.digits.replace(/\D/g, '') === cleanNumber)) {
      this.paymentError = 'Selecciona uno de los números de prueba disponibles debajo del campo.';
      this.cardNumber = '';
      return false;
    }
    if (!this.hasValidExpiry(this.cardExpiry)) {
      this.paymentError = 'Ingresa una fecha de vencimiento válida con el formato MM/AA.';
      return false;
    }
    this.paymentError = '';
    return true;
  }

  private hasValidExpiry(expiry: string): boolean {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry);
    if (!match) return false;
    const year = 2000 + Number(match[2]);
    const month = Number(match[1]);
    return new Date(year, month) > new Date();
  }

  confirmSimulatedPayment() {
    if (this.isProcessing) return;
    if (!isPlatformBrowser(this.platformId) || !this.hasAcceptedTerms()) {
      this.showPaymentModal = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    if (!this.acceptedLegal) {
      this.notify.show('Acepta los términos y el aviso de privacidad para continuar.', 'CONSENTIMIENTO REQUERIDO', 'warning');
      return;
    }
    if (!this.deliveryInfo) {
      this.notify.show('Registra una dirección antes de continuar.', 'DIRECCIÓN REQUERIDA', 'warning');
      return;
    }
    if (!this.validateCardPayment()) {
      return;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser?.email) {
      this.notify.show('No se detectó una sesión válida.', 'SESIÓN NO DISPONIBLE', 'warning');
      return;
    }

    this.isProcessing = true;
    this.paymentError = '';
    this.cdr.markForCheck();

    // Espera breve solo para la animación: no hay comunicación con bancos.
    setTimeout(() => {
      try {
        const chosen = this.selectedSavedCard;
        const cleanNumber = this.cardNumber.replace(/\D/g, '');
        const last4 = chosen?.last4 || cleanNumber.slice(-4);
        const holder = chosen?.holder || this.cardHolder.trim();
        const order = this.ordersService.createOrder({
          items: this.cartItems,
          delivery: this.deliveryInfo!,
          subtotal: this.subtotal,
          shippingCost: this.costoEnvio,
          total: this.total,
          paymentMethod: this.paymentMethod,
          cardHolder: this.paymentMethod === 'tarjeta' ? holder : undefined,
          cardLast4: this.paymentMethod === 'tarjeta' ? last4 : undefined,
          customer: { name: currentUser.name, email: currentUser.email }
        });

        // Guardado opcional de metadatos ficticios, NUNCA del número completo ni del CVV.
        if (this.paymentMethod === 'tarjeta' && !chosen && this.rememberDemoCard) {
          const saved = this.demoCards.saveForUser(currentUser.email, {
            nickname: this.cardNickname.trim(),
            holder,
            brand: this.getCardBrand(cleanNumber),
            last4,
            expiry: this.cardExpiry
          });
          if (!saved) {
            this.notify.show('El pedido se confirmó, pero no fue posible guardar la tarjeta seleccionada.', 'GUARDADO OPCIONAL', 'warning');
          } else {
            this.notify.show('La tarjeta se agregó a tus métodos guardados. Podrás seleccionarla en tu próxima compra.', 'TARJETA GUARDADA', 'success', 4200);
          }
        }

        this.completedOrder = order;
        this.showPaymentModal = false;
        this.showReceiptModal = true;
        this.cartService.clearCart();
        this.notify.show(`Pedido ${order.folio} confirmado. Tu comprobante está disponible en Mis pedidos.`, 'PEDIDO CONFIRMADO', 'success', 4200);
        this.resetPaymentForm(); // Elimina inmediatamente PAN ficticio y CVV de la memoria del formulario.
      } catch {
        this.paymentError = 'No se pudo completar el registro local. Revisa el almacenamiento del navegador e inténtalo de nuevo.';
      } finally {
        this.isProcessing = false;
        // Angular zoneless: actualizar la vista después de finalizar el temporizador.
        this.cdr.markForCheck();
      }
    }, 450);
  }

  goToTracker(): void {
    this.showReceiptModal = false;
    this.router.navigate(['/tracker']);
  }

  goToOrders(): void {
    this.showReceiptModal = false;
    this.router.navigate(['/mis-pedidos']);
  }

  getMaskedCardNumber(): string {
    const last4 = this.completedOrder?.payment.cardLast4;
    return last4 ? `•••• •••• •••• ${last4}` : 'Pago en efectivo';
  }
}
