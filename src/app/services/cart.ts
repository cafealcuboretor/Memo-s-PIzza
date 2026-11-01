import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
}

export interface DeliveryData {
  customerName: string;
  phone: string;
  address: string;
  neighborhood: string;
  specialInstructions: string;
  registeredAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartSubject.asObservable();

  // Observable exclusivo para los datos de entrega
  private deliveryData: DeliveryData | null = null;
  private deliverySubject = new BehaviorSubject<DeliveryData | null>(null);
  delivery$ = this.deliverySubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      // 1. Cargar carrito previo
      const savedCart = localStorage.getItem('memos_cart');
      if (savedCart) {
        try {
          this.cartItems = JSON.parse(savedCart);
          this.cartSubject.next(this.cartItems);
        } catch (e) {
          this.cartItems = [];
        }
      }

      // 2. Cargar datos de entrega previos si existen
      const savedDelivery = localStorage.getItem('memos_delivery');
      if (savedDelivery) {
        try {
          this.deliveryData = JSON.parse(savedDelivery);
          this.deliverySubject.next(this.deliveryData);
        } catch (e) {
          this.deliveryData = null;
        }
      }
    }
  }

  private saveToStorage() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('memos_cart', JSON.stringify(this.cartItems));
    }
    this.cartSubject.next([...this.cartItems]); 
  }

  // --- MÉTODOS DE ENTREGA ---
  setDeliveryData(data: DeliveryData) {
    this.deliveryData = {
      ...data,
      registeredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('memos_delivery', JSON.stringify(this.deliveryData));
    }
    this.deliverySubject.next(this.deliveryData);
  }

  getDeliveryData(): DeliveryData | null {
    return this.deliveryData;
  }

  clearDeliveryData() {
    this.deliveryData = null;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('memos_delivery');
    }
    this.deliverySubject.next(null);
  }

  // --- MÉTODOS DE CARRITO EXISTENTES ---
  addItem(item: Omit<CartItem, 'quantity'>) {
    const existing = this.cartItems.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cartItems.push({ ...item, quantity: 1 });
    }
    this.saveToStorage();
  }

  updateQuantity(id: string, delta: number) {
    const item = this.cartItems.find(i => i.id === id);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeItem(id);
      } else {
        this.saveToStorage();
      }
    }
  }

  removeItem(id: string) {
    this.cartItems = this.cartItems.filter(i => i.id !== id);
    this.saveToStorage();
  }

  getItems(): CartItem[] {
    return this.cartItems;
  }

  getTotalCount(): number {
    return this.cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  clearCart() {
    this.cartItems = [];
    this.saveToStorage();
  }
}