import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { CartItem, DeliveryData } from './cart';

export type OrderStatus = 'pagado' | 'preparando' | 'horneando' | 'empaquetando' | 'en-camino' | 'entregado' | 'cancelado';
export type PaymentMethod = 'efectivo' | 'tarjeta';
export type RefundStatus = 'registrado' | 'no-aplica';

export interface RefundInfo {
  status: RefundStatus;
  recordedAt: string;
  // Plazo informativo para operaciones bancarias reales, no un plazo garantizado para el prototipo.
  bankEstimate?: string;
}

export interface ReceiptData {
  receiptNumber: string;
  invoiceNumber: string;
  paidAt: string;
  method: PaymentMethod;
  cardHolder?: string;
  cardLast4?: string;
}

export interface OrderCustomer {
  name: string;
  email: string;
}

export interface MemosOrder {
  id: string;
  folio: string;
  createdAt: string;
  status: OrderStatus;
  items: CartItem[];
  delivery: DeliveryData;
  subtotal: number;
  shippingCost: number;
  total: number;
  payment: ReceiptData;
  customer: OrderCustomer;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationComment?: string;
  refund?: RefundInfo;
}

const STORAGE_KEY = 'memos_orders_v1';
// La demo permite cancelar durante 60 segundos para una exposición rápida.
// Una futura operación comercial contempla como política inicial 5 minutos;
// no se presenta ese plazo como vigente en el prototipo.
const CANCELLATION_WINDOW_MS = 60 * 1000;
// Mantener la entrega automática posterior al plazo de cancelación (demostración acelerada).
const DELIVERY_AFTER_SECONDS = 110;

@Injectable({ providedIn: 'root' })
export class OrdersService {
  readonly cancellationWindowSeconds = CANCELLATION_WINDOW_MS / 1000;
  private ordersSubject = new BehaviorSubject<MemosOrder[]>([]);
  orders$ = this.ordersSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.load();
  }

  private load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      this.ordersSubject.next(Array.isArray(parsed) ? parsed as MemosOrder[] : []);
    } catch { this.ordersSubject.next([]); }
  }

  private persist(orders: MemosOrder[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    this.ordersSubject.next([...orders]);
  }

  getOrders(): MemosOrder[] {
    return [...this.ordersSubject.value].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  getOrdersForUser(email: string): MemosOrder[] {
    return this.getOrders().filter(order => order.customer?.email?.toLowerCase() === email.trim().toLowerCase());
  }

  getOrderById(id: string, email?: string): MemosOrder | null {
    return (email ? this.getOrdersForUser(email) : this.getOrders()).find(order => order.id === id) || null;
  }

  createOrder(payload: {
    items: CartItem[];
    delivery: DeliveryData;
    subtotal: number;
    shippingCost: number;
    total: number;
    paymentMethod: PaymentMethod;
    cardHolder?: string;
    cardLast4?: string;
    customer: OrderCustomer;
  }): MemosOrder {
    const now = new Date();
    const seed = Math.floor(Math.random() * 9000) + 1000;
    const order: MemosOrder = {
      id: `ord-${now.getTime()}-${seed}`,
      folio: `MEM-${now.getFullYear()}-${seed}`,
      createdAt: now.toISOString(),
      status: 'pagado',
      items: payload.items.map(item => ({ ...item })),
      delivery: { ...payload.delivery },
      subtotal: payload.subtotal,
      shippingCost: payload.shippingCost,
      total: payload.total,
      payment: {
        receiptNumber: `RC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${seed}`,
        invoiceNumber: `FAC-${now.getFullYear()}-${seed}`,
        paidAt: now.toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        method: payload.paymentMethod,
        cardHolder: payload.cardHolder,
        cardLast4: payload.cardLast4
      },
      customer: { ...payload.customer }
    };
    this.persist([order, ...this.getOrders()]);
    return order;
  }

  getCancellationRemainingMs(order: MemosOrder): number {
    if (order.status === 'cancelado' || order.cancelledAt) return 0;
    const start = new Date(order.createdAt).getTime();
    return Number.isFinite(start) ? Math.max(0, start + CANCELLATION_WINDOW_MS - Date.now()) : 0;
  }

  canCancel(order: MemosOrder): boolean {
    const status = this.getEffectiveStatus(order);
    return status !== 'entregado' && status !== 'cancelado' && this.getCancellationRemainingMs(order) > 0;
  }

  /** Operación local académica. Sin backend no autoriza ni ejecuta reembolsos bancarios. */
  cancelOrder(id: string, email: string, reason: string, comment = ''): MemosOrder | null {
    const orders = this.getOrders();
    const index = orders.findIndex(order => order.id === id && order.customer?.email?.toLowerCase() === email.toLowerCase());
    if (index < 0 || !reason.trim() || !this.canCancel(orders[index])) return null;
    const now = new Date().toISOString();
    const method = orders[index].payment.method;
    orders[index] = {
      ...orders[index],
      status: 'cancelado',
      cancelledAt: now,
      cancellationReason: reason.trim().slice(0, 160),
      cancellationComment: comment.trim().slice(0, 280),
      refund: method === 'tarjeta'
        ? { status: 'registrado', recordedAt: now, bankEstimate: 'Referencia informativa: de 5 a 10 días hábiles según el banco, en operaciones reales.' }
        : { status: 'no-aplica', recordedAt: now }
    };
    this.persist(orders);
    return orders[index];
  }

  getEffectiveStatus(order: MemosOrder): OrderStatus {
    if (order.status === 'cancelado' || order.cancelledAt) return 'cancelado';
    const elapsedSeconds = (Date.now() - new Date(order.createdAt).getTime()) / 1000;
    if (elapsedSeconds < 20) return 'pagado';
    if (elapsedSeconds < 40) return 'preparando';
    if (elapsedSeconds < 60) return 'horneando';
    if (elapsedSeconds < 80) return 'empaquetando';
    if (elapsedSeconds < DELIVERY_AFTER_SECONDS) return 'en-camino';
    return 'entregado';
  }

  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'pagado': return 'Pedido confirmado';
      case 'preparando': return 'Preparando pedido';
      case 'horneando': return 'En el horno';
      case 'empaquetando': return 'Empaquetando';
      case 'en-camino': return 'En camino';
      case 'entregado': return 'Entregado';
      case 'cancelado': return 'Pedido cancelado';
    }
  }

  getStatusDescription(status: OrderStatus): string {
    switch (status) {
      case 'pagado': return 'Tu pedido fue registrado correctamente y el comprobante está disponible.';
      case 'preparando': return 'Ya comenzamos a preparar los ingredientes de tu orden.';
      case 'horneando': return 'Tu pizza está en el horno y el pedido avanza sin problema.';
      case 'empaquetando': return 'Estamos verificando tu orden y preparando los acompañamientos.';
      case 'en-camino': return 'Tu pedido se encuentra en la etapa de reparto.';
      case 'entregado': return 'El pedido fue marcado como entregado. ¡Buen provecho!';
      case 'cancelado': return 'La orden fue cancelada y ya no continuará su recorrido.';
    }
  }

  getLatestActiveOrder(email?: string): MemosOrder | null {
    const orders = email ? this.getOrdersForUser(email) : this.getOrders();
    return orders.find(order => {
      const status = this.getEffectiveStatus(order);
      return status !== 'entregado' && status !== 'cancelado';
    }) || null;
  }
}
