import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountsService, WRITE_HEADERS, apiErrorMessage } from '../../services/accounts';
import { MemosOrder, OrdersService } from '../../services/orders';

interface InventoryItem {
  sku: string;
  name: string;
  stock: number;
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './admin-orders.html',
})
export class AdminOrders implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly accounts = inject(AccountsService);
  private readonly platform = inject(PLATFORM_ID);
  readonly statuses = inject(OrdersService);
  readonly orders = signal<MemosOrder[]>([]);
  readonly inventory = signal<InventoryItem[]>([]);
  readonly access = signal<'checking' | 'guest' | 'forbidden' | 'admin'>('checking');
  readonly busy = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    if (isPlatformBrowser(this.platform)) void this.load();
  }

  async load(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const account = await this.accounts.refresh();
      this.access.set(!account ? 'guest' : account.role === 'admin' ? 'admin' : 'forbidden');
      if (this.access() !== 'admin') {
        this.orders.set([]);
        this.inventory.set([]);
        return;
      }
      const options = { transferCache: false, timeout: 8000 };
      const [{ orders }, { inventory }] = await Promise.all([
        firstValueFrom(this.http.get<{ orders: MemosOrder[] }>('/api/admin/orders', options)),
        firstValueFrom(this.http.get<{ inventory: InventoryItem[] }>('/api/admin/inventory', options)),
      ]);
      this.orders.set(orders);
      this.inventory.set(inventory);
    } catch (cause) {
      this.orders.set([]);
      this.inventory.set([]);
      this.error.set(apiErrorMessage(cause, 'No se pudo cargar la operación de prueba.'));
    } finally {
      this.busy.set(false);
    }
  }

  async advance(order: MemosOrder): Promise<void> {
    if (!order.nextStatus || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const { order: updated } = await firstValueFrom(this.http.patch<{ order: MemosOrder }>(
        `/api/admin/orders/${order.id}`, { expectedStatus: order.status }, { headers: WRITE_HEADERS, timeout: 8000 }
      ));
      this.orders.update(orders => orders.map(existing => existing.id === updated.id ? updated : existing));
    } catch (cause) {
      this.error.set(apiErrorMessage(cause, 'No se pudo actualizar la etapa. Recarga el panel.'));
    } finally {
      this.busy.set(false);
    }
  }
}
