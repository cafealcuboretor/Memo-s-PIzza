import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification';
import { MemosOrder, OrdersService } from '../../services/orders';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.css'
})
export class MyOrders implements OnInit, OnDestroy {
  currentOrders: MemosOrder[] = [];
  completedOrders: MemosOrder[] = [];
  cancelledOrders: MemosOrder[] = [];
  selectedOrder: MemosOrder | null = null;
  showReceiptModal = false;
  showCancelModal = false;
  orderToCancel: MemosOrder | null = null;
  cancellationReason = '';
  cancellationComment = '';
  cancellationError = '';
  userEmail = '';
  readonly cancellationReasons = [
    'Cambié de opinión',
    'Elegí productos incorrectos',
    'Mi dirección de entrega es incorrecta',
    'Realicé un pedido duplicado',
    'Otro motivo'
  ];
  private sub?: Subscription;
  private refreshSub?: Subscription;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    public ordersService: OrdersService,
    private notify: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const session = JSON.parse(sessionStorage.getItem('memos_current_user') || 'null');
      if (!session?.email) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/mis-pedidos' } });
        return;
      }
      this.userEmail = session.email;
    } catch {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/mis-pedidos' } });
      return;
    }

    this.sub = this.ordersService.orders$.subscribe(() => this.refreshLists());
    this.refreshLists();
    this.refreshSub = interval(1000).subscribe(() => this.refreshLists());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.refreshSub?.unsubscribe();
  }

  private refreshLists(): void {
    const orders = this.ordersService.getOrdersForUser(this.userEmail);
    this.currentOrders = orders.filter(order => {
      const status = this.ordersService.getEffectiveStatus(order);
      return status !== 'entregado' && status !== 'cancelado';
    });
    this.completedOrders = orders.filter(order => this.ordersService.getEffectiveStatus(order) === 'entregado');
    this.cancelledOrders = orders.filter(order => this.ordersService.getEffectiveStatus(order) === 'cancelado');
    if (this.selectedOrder) {
      this.selectedOrder = this.ordersService.getOrderById(this.selectedOrder.id, this.userEmail);
    }
    // Angular sin Zone.js: refrescar visualmente el estado al cambiar por tiempo.
    this.cdr.markForCheck();
  }

  statusLabel(order: MemosOrder): string {
    return this.ordersService.getStatusLabel(this.ordersService.getEffectiveStatus(order));
  }

  statusDescription(order: MemosOrder): string {
    return this.ordersService.getStatusDescription(this.ordersService.getEffectiveStatus(order));
  }

  canCancel(order: MemosOrder): boolean {
    return this.ordersService.canCancel(order);
  }

  remainingTime(order: MemosOrder): string {
    const sec = Math.ceil(this.ordersService.getCancellationRemainingMs(order) / 1000);
    const minutes = Math.floor(sec / 60);
    return `${String(minutes).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }

  openCancelModal(order: MemosOrder): void {
    if (!this.ordersService.canCancel(order)) {
      this.notify.show('El plazo de cancelación de 60 segundos para esta demostración ya finalizó.', 'CANCELACIÓN NO DISPONIBLE', 'warning');
      return;
    }
    this.orderToCancel = order;
    this.cancellationReason = '';
    this.cancellationComment = '';
    this.cancellationError = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.orderToCancel = null;
    this.cancellationError = '';
  }

  confirmCancellation(): void {
    if (!this.orderToCancel) return;
    if (!this.cancellationReason) {
      this.cancellationError = 'Selecciona un motivo para continuar.';
      return;
    }
    const cancelled = this.ordersService.cancelOrder(
      this.orderToCancel.id, this.userEmail, this.cancellationReason, this.cancellationComment
    );
    if (!cancelled) {
      this.closeCancelModal();
      this.notify.show('El plazo de cancelación terminó o el pedido ya no puede cancelarse.', 'CANCELACIÓN NO DISPONIBLE', 'warning');
      return;
    }
    this.closeCancelModal();
    this.notify.show(
      cancelled.payment.method === 'tarjeta'
        ? `El pedido ${cancelled.folio} se canceló y el reembolso quedó registrado.`
        : `El pedido ${cancelled.folio} fue cancelado correctamente.`,
      'PEDIDO CANCELADO', 'success', 5000
    );
    this.refreshLists();
  }

  refundLabel(order: MemosOrder): string {
    if (order.payment.method === 'efectivo') return 'Sin reembolso: pago en efectivo';
    return order.refund?.status === 'registrado' ? 'Reembolso registrado' : 'Estado del reembolso no disponible';
  }

  openReceipt(order: MemosOrder): void {
    this.selectedOrder = order;
    this.showReceiptModal = true;
  }

  closeReceipt(): void {
    this.showReceiptModal = false;
  }

  getPaymentMethodLabel(order: MemosOrder): string {
    return order.payment.method === 'tarjeta' ? 'Tarjeta' : 'Efectivo';
  }
}
