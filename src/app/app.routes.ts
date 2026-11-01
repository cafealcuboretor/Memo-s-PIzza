import { Legal } from './pages/legal/legal';
import { Settings } from './pages/settings/settings';
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductDetail } from './pages/product-detail/product-detail';
import { Cart } from './pages/cart/cart';
import { Auth } from './pages/auth/auth';
import { OrdenaOnline } from './pages/ordena-online/ordena-online';
import { Menu } from './pages/menu/menu';
import { Promos } from './pages/promos/promos';
import { Tracker } from './pages/tracker/tracker';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'producto', component: ProductDetail }, 
  { path: 'carrito', component: Cart },
  { path: 'login', component: Auth },
  { path: 'ordena-online', component: OrdenaOnline },
  { path: 'menu', component: Menu },
  { path: 'promos', component: Promos },
  { path: 'tracker', component: Tracker },
  { path: 'ajustes', component: Settings },

  { path: 'legal/aviso', component: Legal, data: { section: 'aviso' } },
  { path: 'legal/devoluciones', component: Legal, data: { section: 'devoluciones' } },
  { path: 'legal/promociones', component: Legal, data: { section: 'promociones' } },
  { path: 'legal/atencion', component: Legal, data: { section: 'atencion' } },
  { path: 'legal/privacidad', component: Legal, data: { section: 'privacidad' } },
  { path: 'legal/seguridad', component: Legal, data: { section: 'seguridad' } },
  // SIEMPRE al final de todo:
  { path: '**', redirectTo: '', pathMatch: 'full' } 
];