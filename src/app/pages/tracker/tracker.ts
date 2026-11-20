import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { CartService, DeliveryData } from '../../services/cart';
import { MemosOrder, OrderStatus, OrdersService } from '../../services/orders';

interface TrackingStep {
  step: number;
  label: string;
  camId: string;
  camName: string;
  statusText: string;
  detail: string;
  image: string;
}

@Component({
  selector: 'app-tracker',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tracker.html',
  styleUrl: './tracker.css'
})
export class Tracker implements OnInit, OnDestroy {
  deliveryInfo: DeliveryData | null = null;
  currentOrder: MemosOrder | null = null;
  private statusStepIndex = -1;
  private lastOrderId: string | null = null;
  private previewCamera: TrackingStep | null = null;
  private cameraSwitchTimer?: ReturnType<typeof setTimeout>;

  readonly steps: TrackingStep[] = [
    { step: 1, label: 'COCINA', camId: 'CAM-01', camName: 'PREPARACIÓN DE LA PIZZA', statusText: 'Preparación de ingredientes', detail: 'Nuestro equipo prepara la masa y agrega los ingredientes de tu pedido.', image: '/assets/memos/tracker/cam-01-preparacion.webp' },
    { step: 2, label: 'HORNO', camId: 'CAM-02', camName: 'COCCIÓN', statusText: 'Pizza en el horno', detail: 'Escena ilustrativa del proceso de horneado de Memo’s Pizza.', image: '/assets/memos/tracker/cam-02-horno.webp' },
    { step: 3, label: 'EMPAQUE', camId: 'CAM-04', camName: 'EMPAQUE', statusText: 'Verificación y empaque', detail: 'La pizza se coloca en su caja y se comprueba el contenido.', image: '/assets/memos/tracker/cam-04-empaque.webp' },
    { step: 4, label: 'SALIDA', camId: 'CAM-05', camName: 'SALIDA A REPARTO', statusText: 'Pedido preparado para salir', detail: 'Tu pedido está listo para iniciar el recorrido de entrega.', image: '/assets/memos/tracker/cam-05-salida.webp' },
    { step: 5, label: 'ENTREGA', camId: 'CAM-06', camName: 'ENTREGA AL CLIENTE', statusText: 'Entrega final', detail: 'Recreación de la entrega de un pedido de Memo’s Pizza.', image: '/assets/memos/tracker/cam-06-entrega.webp' }
  ];

  cctvStatic = false;
  private refreshSub?: Subscription;
  private ordersSub?: Subscription;

  constructor(
    private cartService: CartService,
    public ordersService: OrdersService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit() {
    this.cartService.delivery$.subscribe(data => {
      this.deliveryInfo = data;
    });
    this.ordersSub = this.ordersService.orders$.subscribe(() => this.syncOrder());
    this.syncOrder();
    this.refreshSub = interval(3000).subscribe(() => this.syncOrder());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.ordersSub?.unsubscribe();
    clearTimeout(this.cameraSwitchTimer);
  }

  private syncOrder(): void {
    let email = '';
    if (isPlatformBrowser(this.platformId)) {
      try { email = String(JSON.parse(sessionStorage.getItem('memos_current_user') || 'null')?.email || ''); }
      catch { email = ''; }
    }
    const order = email ? (this.ordersService.getLatestActiveOrder(email) || this.ordersService.getOrdersForUser(email)[0] || null) : null;
    const orderId = order?.id ?? null;
    const nextStep = order ? this.stepFromStatus(this.ordersService.getEffectiveStatus(order)) : -1;
    if (this.lastOrderId !== orderId || this.statusStepIndex !== nextStep) {
      clearTimeout(this.cameraSwitchTimer);
      this.previewCamera = null;
      this.cctvStatic = false;
    }
    this.currentOrder = order;
    this.lastOrderId = orderId;
    this.statusStepIndex = nextStep;
    if (order) this.deliveryInfo = order.delivery;
    this.cdr.markForCheck();
  }

  private stepFromStatus(status: OrderStatus): number {
    switch (status) {
      case 'pagado': return 0;
      case 'preparando': return 1;
      case 'horneando': return 2;
      case 'empaquetando': return 3;
      case 'en-camino': return 4;
      case 'entregado': return 5;
      case 'cancelado': return -1;
      default: return 0;
    }
  }

  switchCam(camera: TrackingStep): void {
    clearTimeout(this.cameraSwitchTimer);
    this.cctvStatic = true;
    this.cameraSwitchTimer = setTimeout(() => {
      this.previewCamera = camera;
      this.cctvStatic = false;
      this.cdr.markForCheck();
    }, 180);
  }

  get activeCameraStep(): number {
    return Math.max(1, this.statusStepIndex);
  }

  get progressPercent(): number {
    if (this.statusStepIndex < 0) return 0;
    return Math.min(100, this.statusStepIndex * 20);
  }

  get isCancelled(): boolean {
    return !!this.currentOrder && this.ordersService.getEffectiveStatus(this.currentOrder) === 'cancelado';
  }

  get currentStep(): TrackingStep {
    return this.previewCamera ?? this.steps[this.activeCameraStep - 1];
  }

  get orderStatusLabel(): string {
    if (!this.currentOrder) return 'Sin pedido activo';
    return this.ordersService.getStatusLabel(this.ordersService.getEffectiveStatus(this.currentOrder));
  }

  get orderStatusDescription(): string {
    if (!this.currentOrder) return 'Realiza un pedido para activar el tracker de la orden.';
    return this.ordersService.getStatusDescription(this.ordersService.getEffectiveStatus(this.currentOrder));
  }
}
