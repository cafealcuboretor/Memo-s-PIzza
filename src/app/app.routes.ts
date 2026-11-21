import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

/** Se mantiene Inicio inmediato; el resto carga solo cuando se visita. */
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'producto', loadComponent: () => import('./pages/product-detail/product-detail').then(m => m.ProductDetail) },
  { path: 'carrito', loadComponent: () => import('./pages/cart/cart').then(m => m.Cart) },
  { path: 'login', loadComponent: () => import('./pages/auth/auth').then(m => m.Auth) },
  { path: 'ordena-online', loadComponent: () => import('./pages/ordena-online/ordena-online').then(m => m.OrdenaOnline) },
  { path: 'menu', loadComponent: () => import('./pages/menu/menu').then(m => m.Menu) },
  { path: 'promos', loadComponent: () => import('./pages/promos/promos').then(m => m.Promos) },
  { path: 'tracker', loadComponent: () => import('./pages/tracker/tracker').then(m => m.Tracker) },
  { path: 'ajustes', loadComponent: () => import('./pages/settings/settings').then(m => m.Settings) },
  { path: 'mis-pedidos', loadComponent: () => import('./pages/my-orders/my-orders').then(m => m.MyOrders) },
  { path: 'admin/pedidos', loadComponent: () => import('./pages/admin-orders/admin-orders').then(m => m.AdminOrders) },
  { path: 'legal/aviso', loadComponent: () => import('./pages/legal/legal').then(m => m.Legal), data: { section: 'aviso' } },
  { path: 'legal/devoluciones', loadComponent: () => import('./pages/legal/legal').then(m => m.Legal), data: { section: 'devoluciones' } },
  { path: 'legal/promociones', loadComponent: () => import('./pages/legal/legal').then(m => m.Legal), data: { section: 'promociones' } },
  { path: 'legal/atencion', loadComponent: () => import('./pages/legal/legal').then(m => m.Legal), data: { section: 'atencion' } },
  { path: 'legal/privacidad', loadComponent: () => import('./pages/legal/legal').then(m => m.Legal), data: { section: 'privacidad' } },
  { path: 'legal/cookies', loadComponent: () => import('./pages/legal/legal').then(m => m.Legal), data: { section: 'cookies' } },
  { path: 'legal/seguridad', loadComponent: () => import('./pages/legal/legal').then(m => m.Legal), data: { section: 'seguridad' } },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
