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
      image: '/Combo Guardia Nocturna.webp', 
      badgeText: '30% OFF', 
      badgeColor: 'bg-danger' 
    },
    { 
      id: 'favorita-memo', 
      name: 'LA FAVORITA DE MEMO', 
      description: 'Lleva dos pizzas medianas de especialidad al precio de una.', 
      price: 199.00, 
      image: '/La Favorita de Memo.webp', 
      badgeText: '2x1', 
      badgeColor: 'bg-danger' 
    },
    { 
      id: 'especial-animatronico', 
      name: 'ESPECIAL ANIMATRÓNICO', 
      description: 'Pizza Familiar de Carnes Frías + Orilla de Queso rellena.', 
      price: 299.00, 
      image: '/Especial Animatrónico.webp', 
      badgeText: 'PROMO', 
      badgeColor: 'bg-success' 
    },
    { 
      id: 'postre-oficina', 
      name: 'POSTRE DE LA OFICINA', 
      description: 'Pastelillo de chocolate oscuro con chispa sorpresa.', 
      price: 89.00, 
      image: '/Postre de la Oficina.webp', 
      badgeText: 'NUEVO', 
      badgeColor: 'bg-warning text-dark' 
    }
  ];

  constructor(private cartService: CartService) {}

  addToCart(promo: Promo) {
    this.cartService.addItem({
      id: promo.id,
      name: promo.name,
      price: promo.price,
      emoji: '🍕'
    });
  }
}