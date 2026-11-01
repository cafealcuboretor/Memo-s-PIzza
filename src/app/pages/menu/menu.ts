import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart';
import { NotificationService } from '../../services/notification';

interface MenuItem {
  id: string;
  name: string;
  category: 'pizzas' | 'bebidas' | 'postres';
  description: string;
  price: number;
  emoji: string;
  image: string;
  tag?: string;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu {
  activeFilter: 'todos' | 'pizzas' | 'bebidas' | 'postres' = 'todos';
  searchTerm: string = '';

  private cartService = inject(CartService);
  private notify = inject(NotificationService);

  catalog: MenuItem[] = [
    // Pizzas
    { 
      id: 'pz-freddy', 
      name: 'La Fazbear Especial', 
      category: 'pizzas', 
      description: 'Doble porción de pepperoni crujiente, queso provolone ahumado y orilla de ajo.', 
      price: 219.00, 
      emoji: '🍕', 
      image: 'La Fazbear Especial.webp', 
      tag: 'MÁS PEDIDA' 
    },
    { 
      id: 'pz-bonnie', 
      name: 'Guitar Jam Clásica', 
      category: 'pizzas', 
      description: 'Base de 4 quesos selectos, albahaca fresca y salsa marinara de la casa.', 
      price: 189.00, 
      emoji: '🍕', 
      image: 'Guitar Jam Clásica.webp' 
    },
    { 
      id: 'pz-foxy', 
      name: 'Garfio Hawaiano', 
      category: 'pizzas', 
      description: 'Jamón horneado, piña caramelizada al sartén y toque ligero de jalapeño.', 
      price: 199.00, 
      emoji: '🍕', 
      image: 'Garfio Hawaiano.webp' 
    },
    { 
      id: 'pz-carnivora', 
      name: 'Festín Carnívoro', 
      category: 'pizzas', 
      description: 'Salchicha italiana, tocino ahumado, carne molida especiada y pepperoni.', 
      price: 239.00, 
      emoji: '🥩', 
      image: 'Festín Carnívoro.webp', 
      tag: 'ESPECIAL' 
    },
    
    // Bebidas
    { 
      id: 'bev-cola', 
      name: 'Refresco Faz-Cola', 
      category: 'bebidas', 
      description: 'Refresco clásico de cola bien frío servido en vaso coleccionable de 600ml.', 
      price: 45.00, 
      emoji: '🥤', 
      image: 'Refresco Faz-Cola.webp' 
    },
    { 
      id: 'bev-shake', 
      name: 'Malteada de Vainilla', 
      category: 'bebidas', 
      description: 'Batido espeso artesanal con crema batida y cereza en almíbar.', 
      price: 65.00, 
      emoji: '🥛', 
      image: 'Malteada de Vainilla.webp' 
    },
    { 
      id: 'bev-jugo', 
      name: 'Ponche Pirata', 
      category: 'bebidas', 
      description: 'Jugo tropical natural de fresa, naranja y arándano.', 
      price: 50.00, 
      emoji: '🧃', 
      image: 'Ponche Pirata.webp' 
    },

    // Postres
    { 
      id: 'dst-chica', 
      name: 'Cupcake de Chica', 
      category: 'postres', 
      description: 'Pastelillo esponjoso de terciopelo con betún rosa y chispas de colores.', 
      price: 55.00, 
      emoji: '🧁', 
      image: 'Cupcake de Chica.webp', 
      tag: 'FAVORITO' 
    },
    { 
      id: 'dst-brownie', 
      name: 'Brownie Turno Nocturno', 
      category: 'postres', 
      description: 'Bizcocho denso de chocolate amargo con nuez y centro fundido.', 
      price: 60.00, 
      emoji: '🍫', 
      image: 'Brownie Turno Nocturno.webp' 
    }
  ];

  get filteredItems(): MenuItem[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.catalog.filter(item => {
      const matchesCategory = this.activeFilter === 'todos' || item.category === this.activeFilter;
      const matchesSearch = !term || 
                            item.name.toLowerCase().includes(term) || 
                            item.description.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }

  setFilter(category: 'todos' | 'pizzas' | 'bebidas' | 'postres') {
    this.activeFilter = category;
  }

  clearSearch() {
    this.searchTerm = '';
  }

  addToCart(item: MenuItem) {
    this.cartService.addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      emoji: item.emoji
    });
    this.notify.show(`${item.name} se añadió a tu orden.`, 'SUMINISTRO REGISTRADO', 'success');
  }
}