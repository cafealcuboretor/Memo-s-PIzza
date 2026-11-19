import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart'; 

interface Promo {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  badgeText: string;
  badgeColor: string; 
}

@Component({
  selector: 'app-promos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promos.html',
  styleUrl: './promos.css'
})
export class Promos {
  ofertas: Promo[] = [
    { 
      id: 'combo-guardia', 
      name: 'COMBO GUARDIA NOCTURNA', 
      description: '2 Pizzas Grandes Pepperoni + 2 Bebidas + Pan de Ajo.', 
      price: 249.00, 
      image: '/assets/memos/promociones/combo-guardia.webp', 
      badgeText: '30% OFF', 
      badgeColor: 'bg-danger' 
    },
    { 
      id: 'favorita-memo', 
      name: 'LA FAVORITA DE MEMO', 
      description: 'Lleva dos pizzas medianas de especialidad al precio de una.', 
      price: 199.00, 
      image: '/assets/memos/promociones/dos-por-uno.webp', 
      badgeText: '2x1', 
      badgeColor: 'bg-danger' 
    },
    { 
      id: 'especial-animatronico', 
      name: 'ESPECIAL ANIMATRÓNICO', 
      description: 'Pizza Familiar de Carnes Frías + Orilla de Queso rellena.', 
      price: 299.00, 
      image: '/assets/memos/promociones/pizza-especial.webp', 
      badgeText: 'PROMO', 
      badgeColor: 'bg-success' 
    },
    { 
      id: 'postre-oficina', 
      name: 'POSTRE DE LA OFICINA', 
      description: 'Pastelillo de chocolate oscuro con chispa sorpresa.', 
      price: 89.00, 
      image: '/assets/memos/promociones/postres.webp', 
      badgeText: 'NUEVO', 
      badgeColor: 'bg-warning text-dark' 
    },
    {
      id: 'combo-memo-refresco',
      name: 'COMBO MEMO CON REFRESCO',
      description: 'Pizza de pepperoni, refresco de fresa y un mini postre. Disponible dentro de nuestras promociones; sujeta a disponibilidad.',
      price: 279.00,
      image: '/assets/memos/promociones/combo-refresco.webp',
      badgeText: 'COMBO',
      badgeColor: 'bg-danger'
    }
  ];

  constructor(private cartService: CartService) {}

  addToCart(promo: Promo) {
    this.cartService.addItem({
      id: promo.id,
      name: promo.name,
      price: promo.price,
      emoji: '🍕',
      image: promo.image,
      category: 'promociones'
    });
  }
}