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
    },
    // Nuevas pizzas de Memo's Pizza: fotos recreadas para el catálogo.
    { id: 'pz-hawaiana-memo', name: 'Hawaiana Especial de Memo', category: 'pizzas', description: 'Piña dorada, carne sazonada, pimientos frescos, cebolla morada y queso fundido.', price: 215, emoji: '🍍', image: 'assets/memos/catalogo/pizza-hawaiana-especial.webp', tag: 'NUEVA' },
    { id: 'pz-mexicana-memo', name: 'Mexicana Picante', category: 'pizzas', description: 'Chorizo, jalapeños, cebolla morada, cilantro y nuestra salsa de tomate.', price: 225, emoji: '🌶️', image: 'assets/memos/catalogo/pizza-mexicana-picante.webp', tag: 'PICANTE' },
    { id: 'pz-veggie-memo', name: 'Huerto de Medianoche', category: 'pizzas', description: 'Champiñones, aceitunas negras, pimientos, cebolla y tomates frescos.', price: 205, emoji: '🥬', image: 'assets/memos/catalogo/pizza-vegetariana.webp' },
    { id: 'pz-margarita-memo', name: 'Margarita de la Casa', category: 'pizzas', description: 'Mozzarella gratinada, jitomate, albahaca y un toque de aceite de oliva.', price: 185, emoji: '🌿', image: 'assets/memos/catalogo/pizza-margarita.webp' },
    { id: 'pz-pepperoni-memo', name: 'Pepperoni Retro', category: 'pizzas', description: 'Pepperoni generoso, mozzarella, salsa de tomate y orilla dorada.', price: 199, emoji: '🍕', image: 'assets/memos/catalogo/pizza-pepperoni.webp' },
    // Refrescos con etiqueta ficticia, creada para el proyecto.
    { id: 'bev-lime-memo', name: 'Lime Splash', category: 'bebidas', description: 'Refresco frío sabor limón-lima, presentación de 600 ml.', price: 39, emoji: '🥤', image: 'assets/memos/catalogo/lime-splash.webp', tag: 'NUEVO' },
    { id: 'bev-berry-memo', name: 'Berry Burst', category: 'bebidas', description: 'Refresco burbujeante sabor fresa, presentación de 2 L.', price: 59, emoji: '🍓', image: 'assets/memos/catalogo/berry-burst.webp' },
    // Postres recreados con el mismo estilo fotográfico.
    { id: 'dst-mousse-memo', name: 'Mousse Choco-Memo', category: 'postres', description: 'Mousse de chocolate cremoso servido en vaso con crema y virutas de cacao.', price: 75, emoji: '🍫', image: 'assets/memos/catalogo/mousse-choco-memo.webp' },
    { id: 'dst-mini-cheesecake', name: 'Mini Cheesecake Fresa Noche', category: 'postres', description: 'Mini cheesecake con fresa bañada en chocolate y base de galleta.', price: 79, emoji: '🍓', image: 'assets/memos/catalogo/mini-cheesecakes-fresa.webp', tag: 'NUEVO' },
    { id: 'dst-pay-limon', name: 'Pay de Limón', category: 'postres', description: 'Rebanada cremosa de limón con base crujiente, crema batida y ralladura.', price: 69, emoji: '🍋', image: 'assets/memos/catalogo/pay-limon.webp' },
    { id: 'dst-flan-chocolate', name: 'Flan de Chocolate', category: 'postres', description: 'Flan de chocolate suave, acompañado de virutas de chocolate oscuro.', price: 65, emoji: '🍮', image: 'assets/memos/catalogo/flan-chocolate.webp' },

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
      emoji: item.emoji,
      image: item.image,
      category: item.category
    });
    this.notify.show(`${item.name} se añadió a tu orden.`, 'SUMINISTRO REGISTRADO', 'success');
  }
}