import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem, DeliveryData } from '../../services/cart';
import { NotificationService } from '../../services/notification';
import { MemosOrder, OrdersService, PaymentMethod } from '../../services/orders';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountsService, apiErrorMessage } from '../../services/accounts';

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

  paymentError = '';
  openingPayment = false;

  constructor(
    private cartService: CartService,
    private ordersService: OrdersService,
    private accounts: AccountsService,
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

  async openPaymentModal(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.openingPayment) return;
    if (!this.deliveryInfo || !this.cartItems.length) {
      this.notify.show('Agrega productos y registra una dirección de prueba.', 'REVISA EL PEDIDO', 'warning');
      return;
    }

    this.openingPayment = true;
    try {
      if (!await this.accounts.refresh()) {
        this.requestLogin();
        return;
      }
      this.acceptedLegal = false;
      this.paymentMethod = 'efectivo';
      this.paymentError = '';
      this.showPaymentModal = true;
    } catch (cause) {
      this.notify.show(apiErrorMessage(cause, 'No se pudo comprobar tu sesión.'), 'SERVICIO NO DISPONIBLE', 'warning');
    } finally {
      this.openingPayment = false;
      this.cdr.markForCheck();
    }
  }

  private requestLogin(): void {
    this.showPaymentModal = false;
    this.notify.show('Inicia sesión para confirmar tu pedido.', 'CUENTA REQUERIDA', 'warning');
    void this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
  }

  closePaymentModal(): void {
    if (!this.isProcessing) this.showPaymentModal = false;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
  }

  selectPaymentMethod(method: PaymentMethod): void {
    if (this.isProcessing) return;
    this.paymentMethod = method;
    this.paymentError = '';
  }

  async confirmSimulatedPayment(): Promise<void> {
    if (this.isProcessing || !this.acceptedLegal || !this.deliveryInfo || !this.cartItems.length) return;
    this.isProcessing = true;
    this.paymentError = '';
    try {
      const order = await this.ordersService.checkout({
        items: this.cartItems,
        delivery: this.deliveryInfo,
        total: this.total,
        paymentMethod: this.paymentMethod,
      });
      this.completedOrder = order;
      this.showPaymentModal = false;
      this.showReceiptModal = true;
      this.cartService.clearCart();
      this.notify.show(`Pedido ${order.folio} registrado. Consulta tu comprobante en Mis pedidos.`, 'PEDIDO CONFIRMADO', 'success', 4200);
    } catch (cause) {
      if (cause instanceof HttpErrorResponse && cause.status === 401) {
        this.requestLogin();
      } else {
        this.paymentError = apiErrorMessage(cause, 'No se pudo confirmar la respuesta. Intenta de nuevo con el mismo carrito.');
      }
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  goToTracker(): void {
    this.showReceiptModal = false;
    this.router.navigate(['/tracker']);
  }

  goToOrders(): void {
    this.showReceiptModal = false;
    this.router.navigate(['/mis-pedidos']);
  }

}
