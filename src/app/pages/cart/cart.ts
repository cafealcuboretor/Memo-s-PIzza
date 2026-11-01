import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem, DeliveryData } from '../../services/cart';
import { NotificationService } from '../../services/notification';

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

  // Inyección del servicio de notificaciones
  private notify = inject(NotificationService);

  // Control del modal de pago simulado
  showPaymentModal = false;
  paymentMethod: 'efectivo' | 'tarjeta' = 'efectivo';
  isProcessing = false;
  acceptedLegal = false;


  constructor(
    private cartService: CartService,
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

  increaseQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.id, 1);
  }

  decreaseQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.id, -1);
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.id);
  }

  clearCart() {
    this.cartService.clearCart();
    this.notify.show('El carrito ha sido vaciado por completo.', 'REGISTRO LIMPIO', 'warning');
  }

  removeDelivery() {
    this.cartService.clearDeliveryData();
    this.notify.show('Dirección eliminada de la bitácora.', 'BASE DE DATOS', 'warning');
  }

  // Métodos de simulación de pago
  openPaymentModal() {
    // Contratación: primero registro e inicio de sesión con términos aceptados.
    if (!isPlatformBrowser(this.platformId) || !this.hasAcceptedTerms()) {
      this.notify.show('Inicia sesión y acepta los Términos y Condiciones antes de confirmar tu orden.', 'CUENTA REQUERIDA', 'warning');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    if (!this.deliveryInfo) {
      this.notify.show('Por favor registra primero la dirección de entrega antes de pagar.', 'DESTINO NO ENCONTRADO', 'warning');
      return;
    }
    this.acceptedLegal = false;
    this.showPaymentModal = true;
  }

  private hasAcceptedTerms(): boolean {
    try {
      const session = JSON.parse(sessionStorage.getItem('memos_current_user') || 'null');
      return !!session?.email && session?.acceptedTermsVersion === '1.0-2026-10-29';
    } catch { return false; }
  }

  closePaymentModal() {
    if (!this.isProcessing) {
      this.showPaymentModal = false;
    }
  }

  confirmSimulatedPayment() {
    if (!isPlatformBrowser(this.platformId) || !this.hasAcceptedTerms()) {
      this.showPaymentModal = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    if (!this.acceptedLegal) {
      this.notify.show('Acepta los términos y el aviso de privacidad para continuar.', 'CONSENTIMIENTO REQUERIDO', 'warning');
      return;
    }
    this.isProcessing = true;

    setTimeout(() => {
      this.isProcessing = false;
      this.showPaymentModal = false;
      this.cartService.clearCart();
      this.notify.show('¡Demostración finalizada! La orden se registró localmente; no se cobró ninguna tarjeta.', 'Orden simulada', 'success');
      this.router.navigate(['/tracker']);
    }, 1800);
  }
}