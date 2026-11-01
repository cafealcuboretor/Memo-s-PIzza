import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem, DeliveryData } from '../../services/cart';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-ordena-online',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ordena-online.html',
  styleUrl: './ordena-online.css'
})
export class OrdenaOnline implements OnInit {
  cartItems: CartItem[] = [];
  
  orderForm: DeliveryData = {
    customerName: '',
    phone: '',
    address: '',
    neighborhood: '',
    specialInstructions: ''
  };

  orderSuccess = false;
  orderId = '';

  private notify = inject(NotificationService);

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
    });

    const savedDelivery = this.cartService.getDeliveryData();
    if (savedDelivery) {
      this.orderForm = { ...savedDelivery };
    }
  }

  get subtotal(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
  }

  get deliveryFee(): number {
    return this.cartItems.length > 0 ? 35.00 : 0;
  }

  get total(): number {
    return this.subtotal + this.deliveryFee;
  }

  submitOrder() {
    if (!this.orderForm.customerName || !this.orderForm.phone || !this.orderForm.address) {
      this.notify.show('Por favor escribe al menos Nombre, Teléfono y Dirección.', 'DATOS INCOMPLETOS', 'warning');
      return;
    }

    // 1. Guarda los datos en el servicio (y en localStorage)
    this.cartService.setDeliveryData(this.orderForm);

    // 2. Notificación Fazbear y redirección al carrito
    this.notify.show('¡Dirección de entrega registrada con éxito!', 'Ubicación Guardada', 'success');
    this.router.navigate(['/carrito']);
  }

  goToTracker() {
    this.router.navigate(['/tracker']);
  }
}