import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { CartItem, DeliveryData } from './cart';
import { AccountsService, TERMS_VERSION, WRITE_HEADERS } from './accounts';

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
  simulated?: boolean;
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
  source?: 'server';
  nextStatus?: OrderStatus | null;
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
const SIMULATIONS_KEY = 'memos_local_cancellations';
const CHECKOUT_KEY = 'memos_checkout_attempt';
type Cancellation = Pick<MemosOrder, 'cancelledAt' | 'cancellationReason' | 'cancellationComment' | 'refund'>;
// La demo permite cancelar durante 60 segundos para una exposición rápida.
// Una futura operación comercial contempla como política inicial 5 minutos;
// no se presenta ese plazo como vigente en el prototipo.
const CANCELLATION_WINDOW_MS = 60 * 1000;
// Mantener la entrega automática posterior al plazo de cancelación (demostración acelerada).
const DELIVERY_AFTER_SECONDS = 110;

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly accounts = inject(AccountsService);
  readonly cancellationWindowSeconds = CANCELLATION_WINDOW_MS / 1000;
  private localOrders: MemosOrder[] = [];
  private serverOrders: MemosOrder[] = [];
  private serverAccountId?: string;
  private reload?: { accountId: string; finished: Promise<void> };
  private attempt?: { fingerprint: string; id: string };
  private cancelledLocally: Record<string, Cancellation> = {};
  private ordersSubject = new BehaviorSubject<void>(undefined);
  orders$ = this.ordersSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.load();
  }

  private load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      this.localOrders = Array.isArray(parsed) ? parsed as MemosOrder[] : [];
      this.cancelledLocally = JSON.parse(localStorage.getItem(SIMULATIONS_KEY) || '{}') || {};
      this.attempt = JSON.parse(sessionStorage.getItem(CHECKOUT_KEY) || 'null') || undefined;
    } catch { /* El almacenamiento local es opcional para las operaciones del servidor. */ }
  }

  getOrders(): MemosOrder[] {
    const server = this.serverAccountId === this.accounts.user()?.id ? this.serverOrders : [];
    const simulated = server.map(order => {
      const cancellation = this.cancelledLocally[order.id];
      return cancellation ? { ...order, ...cancellation, status: 'cancelado' as const } : order;
    });
    return [...simulated, ...this.localOrders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  getOrdersForUser(email: string): MemosOrder[] {
    return this.getOrders().filter(order => order.customer?.email?.toLowerCase() === email.trim().toLowerCase());
  }

  getOrderById(id: string, email?: string): MemosOrder | null {
    return (email ? this.getOrdersForUser(email) : this.getOrders()).find(order => order.id === id) || null;
  }

  refresh(): Promise<void> {
    const account = this.accounts.user();
    if (!account) return Promise.resolve();
    if (this.reload?.accountId === account.id) return this.reload.finished;
    const finished = firstValueFrom(this.http.get<{ orders: MemosOrder[] }>('/api/orders', {
      transferCache: false, timeout: 8000
    })).then(({ orders }) => {
      if (this.accounts.user()?.id !== account.id) return;
      this.serverAccountId = account.id;
      this.serverOrders = orders;
      this.ordersSubject.next();
    }).catch(async cause => {
      if (cause instanceof HttpErrorResponse && cause.status === 401) await this.accounts.refresh();
      throw cause;
    }).finally(() => {
      if (this.reload?.finished === finished) this.reload = undefined;
    });
    this.reload = { accountId: account.id, finished };
    return finished;
  }

  async checkout(payload: {
    items: CartItem[];
    delivery: DeliveryData;
    total: number;
    paymentMethod: PaymentMethod;
  }): Promise<MemosOrder> {
    const accountId = this.accounts.user()?.id;
    const { customerName, phone, address, neighborhood, specialInstructions } = payload.delivery;
    const body = {
      accountId,
      items: payload.items.map(({ id, quantity }) => ({ sku: id, quantity })).sort((a, b) => a.sku.localeCompare(b.sku)),
      delivery: { customerName, phone, address, neighborhood, specialInstructions },
      expectedTotalCents: Math.round(payload.total * 100),
      method: payload.paymentMethod === 'tarjeta' ? 'tarjeta_simulada' : 'efectivo',
      termsVersion: TERMS_VERSION,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(body));
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map(value => value.toString(16).padStart(2, '0')).join('');
    if (this.attempt?.fingerprint !== fingerprint) {
      this.attempt = { fingerprint, id: crypto.randomUUID() };
      this.storeAttempt();
    }
    const { order } = await firstValueFrom(this.http.post<{ order: MemosOrder }>('/api/orders', body, {
      headers: { ...WRITE_HEADERS, 'Idempotency-Key': this.attempt.id },
      timeout: 8000
    }));
    if (this.accounts.user()?.id === accountId) {
      if (this.serverAccountId !== accountId) this.serverOrders = [];
      this.serverAccountId = accountId;
      this.serverOrders = [order, ...this.serverOrders.filter(existing => existing.id !== order.id)];
      this.ordersSubject.next();
    }
    this.attempt = undefined;
    this.storeAttempt();
    return order;
  }

  private storeAttempt(): void {
    try {
      if (this.attempt) sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(this.attempt));
      else sessionStorage.removeItem(CHECKOUT_KEY);
    } catch { /* La clave también se conserva en memoria mientras la página siga abierta. */ }
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

  /** Simulación académica que solo afecta lo que se muestra en este navegador. */
  cancelOrder(id: string, email: string, reason: string, comment = ''): MemosOrder | null {
    const order = this.getOrderById(id, email);
    if (!order || !reason.trim() || !this.canCancel(order)) return null;
    const now = new Date().toISOString();
    const cancellation: Cancellation = {
      cancelledAt: now,
      cancellationReason: reason.trim().slice(0, 160),
      cancellationComment: comment.trim().slice(0, 280),
      refund: order.payment.method === 'tarjeta'
        ? { status: 'registrado', recordedAt: now }
        : { status: 'no-aplica', recordedAt: now }
    };
    const cancelled: MemosOrder = { ...order, ...cancellation, status: 'cancelado' };
    if (order.source === 'server') {
      this.cancelledLocally[id] = cancellation;
      localStorage.setItem(SIMULATIONS_KEY, JSON.stringify(this.cancelledLocally));
    } else {
      this.localOrders = this.localOrders.map(existing => existing.id === id ? cancelled : existing);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.localOrders));
    }
    this.ordersSubject.next();
    return cancelled;
  }

  getEffectiveStatus(order: MemosOrder): OrderStatus {
    if (order.status === 'cancelado' || order.cancelledAt) return 'cancelado';
    if (order.source === 'server') return order.status;
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
