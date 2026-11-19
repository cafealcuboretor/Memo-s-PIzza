import { AfterViewInit, Component, HostListener, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

interface NewspaperArticle {
  id: number;
  edition: string;
  date: string;
  tag: string;
  kicker: string;
  headline: string;
  subheadline: string;
  content: string[];
  image: string;
  imageAlt: string;
  photoCaption: string;
  preview: string;
  promoLabel: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements AfterViewInit, OnDestroy {
  isVideoMuted = true;
  stageLightsOn = true;
  selectedArticle: NewspaperArticle | null = null;
  private revealObserver?: IntersectionObserver;
  private savedOverflow = '';

  // Contenido editorial alegre basado en productos y promociones que ya existen en el menú.
  // No se anuncian programas de recompensas ni ventas reales inexistentes.
  articles: NewspaperArticle[] = [
    {
      id: 1,
      edition: 'NÚM. 01',
      date: 'NOVIEMBRE 2026',
      tag: 'PROMOCIONES',
      kicker: '¡UNA NOTICIA PARA COMPARTIR!',
      headline: '¡DOBLE ALEGRÍA EN CADA REBANADA!',
      subheadline: 'La Favorita de Memo reúne dos pizzas medianas de especialidad.',
      preview: 'Una promoción pensada para disfrutar en compañía.',
      content: [
        'En Memo’s Pizza, las mejores noches se celebran juntos. Por eso, La Favorita de Memo reúne dos pizzas medianas de especialidad en una oferta que vale la pena conocer.',
        'Perfecta para elegir tus sabores favoritos y convertir cualquier reunión en una noche especial.',
        '¿Quieres saber más? Revisa las promociones y descubre todos los detalles antes de ordenar.'
      ],
      image: '/assets/memos/promociones/dos-por-uno.webp',
      imageAlt: 'Fotografía de la promoción de dos pizzas de Memo’s Pizza',
      photoCaption: 'LA FAVORITA DE MEMO · DISPONIBLE EN PROMOCIONES',
      promoLabel: 'Conocer el 2×1'
    },
    {
      id: 2,
      edition: 'NÚM. 02',
      date: 'NOVIEMBRE 2026',
      tag: 'COMBOS',
      kicker: '¡LA MESA ESTÁ SERVIDA!',
      headline: '¡EL COMBO QUE ALEGRA TU NOCHE!',
      subheadline: 'Pizza, bebidas y pan de ajo en una sola celebración.',
      preview: 'Una selección para compartir sin dejar a nadie fuera.',
      content: [
        'El Combo Guardia Nocturna está preparado para quienes prefieren disfrutar de una comida completa: pizzas, bebidas y pan de ajo para acompañar.',
        'Su presentación reúne los sabores clásicos de la pizzería y le da un toque especial al turno nocturno.',
        '¿Quieres saber más? Entra a Promociones y descubre qué incluye el combo.'
      ],
      image: '/assets/memos/promociones/combo-guardia.webp',
      imageAlt: 'Fotografía del combo Guardia Nocturna de Memo’s Pizza',
      photoCaption: 'COMBO GUARDIA NOCTURNA · ESPECIAL PARA COMPARTIR',
      promoLabel: 'Explorar el combo'
    },
    {
      id: 3,
      edition: 'NÚM. 03',
      date: 'NOVIEMBRE 2026',
      tag: 'ESPECIALIDADES',
      kicker: '¡SABORES QUE SE ROBAN EL SHOW!',
      headline: '¡UNA PIZZA DIGNA DE ESTRELLAS!',
      subheadline: 'El Especial Animatrónico se suma a la función.',
      preview: 'Una especialidad generosa con mucho sabor.',
      content: [
        'El escenario de Memo’s Pizza tiene una protagonista deliciosa: el Especial Animatrónico, una pizza familiar con carnes frías y orilla rellena de queso.',
        'Cada porción está pensada para quienes buscan una noche llena de sabor y buen ambiente.',
        '¿Quieres saber más? Visita Promociones y conoce la especialidad destacada.'
      ],
      image: '/assets/memos/promociones/pizza-especial.webp',
      imageAlt: 'Pizza de especialidad Animatrónico de Memo’s Pizza',
      photoCaption: 'ESPECIAL ANIMATRÓNICO · PIZZA FAMILIAR',
      promoLabel: 'Ver especialidad'
    },
    {
      id: 4,
      edition: 'NÚM. 04',
      date: 'NOVIEMBRE 2026',
      tag: 'POSTRES',
      kicker: '¡EL GRAN FINAL MÁS DULCE!',
      headline: '¡UN POSTRE PARA CERRAR CON SONRISAS!',
      subheadline: 'Chocolate, antojo y un final perfecto para compartir.',
      preview: 'Dulces momentos después de la última rebanada.',
      content: [
        'Cuando termina la pizza, comienza la parte dulce de la noche. El Postre de la Oficina trae chocolate y un toque especial a la mesa.',
        'Es una opción ideal para acompañar tu comida, darte un gusto o compartir un detalle con alguien más.',
        '¿Quieres saber más? Revisa las promociones de Memo’s Pizza y conoce las opciones de postres.'
      ],
      image: '/assets/memos/promociones/postres.webp',
      imageAlt: 'Fotografía de los postres de Memo’s Pizza',
      photoCaption: 'POSTRES DE LA CASA · SABORES PARA DISFRUTAR',
      promoLabel: 'Ver postres y ofertas'
    },
    {
      id: 5,
      edition: 'NÚM. 05',
      date: 'NOVIEMBRE 2026',
      tag: 'NOVEDADES',
      kicker: '¡UN COMBO CON MUCHA PERSONALIDAD!',
      headline: '¡PIZZA, REFRESCO Y UN DULCE FINAL!',
      subheadline: 'El Combo Memo con Refresco invita a disfrutar de todo.',
      preview: 'Una combinación hecha para darte un gusto.',
      content: [
        '¿No puedes decidir entre una pizza y algo dulce? El Combo Memo con Refresco reúne pizza de pepperoni, una bebida sabor fresa y un mini postre.',
        'Una selección con sabores conocidos y un toque de diversión que encaja perfectamente en nuestro Family Dinner.',
        '¿Quieres saber más? Revisa las promociones y descubre el combo completo.'
      ],
      image: '/assets/memos/promociones/combo-refresco.webp',
      imageAlt: 'Combo de pizza, bebida y postre de Memo’s Pizza',
      photoCaption: 'COMBO MEMO CON REFRESCO · SELECCIÓN ESPECIAL',
      promoLabel: 'Descubrir el combo'
    },
    {
      id: 6,
      edition: 'NÚM. 06',
      date: 'NOVIEMBRE 2026',
      tag: 'FAMILY DINNER',
      kicker: '¡LA DIVERSIÓN SIGUE!',
      headline: '¡UNA NOCHE QUE SABE MEJOR EN FAMILIA!',
      subheadline: 'Pizzas, momentos felices y sorpresas en el menú.',
      preview: 'Haz de cada visita un recuerdo especial.',
      content: [
        'La mejor parte de Memo’s Family Dinner siempre será reunir a quienes disfrutan de una buena pizza y una noche divertida.',
        'Entre pizzas, bebidas, postres y un escenario con personalidad propia, cada sección de nuestra carta guarda una sorpresa.',
        '¿Quieres saber más? Echa un vistazo a Promociones y elige tu próxima favorita.'
      ],
      image: '/assets/memos/promociones/combo-refresco.webp',
      imageAlt: 'Pizza con bebida y postre en Memo’s Family Dinner',
      photoCaption: 'MEMO’S FAMILY DINNER · UNA NOCHE PARA RECORDAR',
      promoLabel: 'Visitar promociones'
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  openArticle(article: NewspaperArticle): void {
    this.selectedArticle = article;
    if (isPlatformBrowser(this.platformId)) {
      this.savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  }

  closeArticle(): void {
    this.selectedArticle = null;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = this.savedOverflow;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedArticle) this.closeArticle();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (typeof IntersectionObserver !== 'undefined') {
      this.revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      document.querySelectorAll('.home-reveal').forEach(el => this.revealObserver?.observe(el));
    } else {
      document.querySelectorAll('.home-reveal').forEach(el => el.classList.add('is-visible'));
    }
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    if (isPlatformBrowser(this.platformId) && this.selectedArticle) {
      document.body.style.overflow = this.savedOverflow;
    }
  }

  toggleStageLights(): void {
    this.stageLightsOn = !this.stageLightsOn;
  }

  toggleVideoMute(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const video = document.getElementById('promo-video') as HTMLVideoElement | null;
    if (!video) return;
    video.muted = !video.muted;
    this.isVideoMuted = video.muted;
    const globalMusic = document.getElementById('global-music') as HTMLAudioElement | null;
    if (globalMusic && !this.isVideoMuted) {
      globalMusic.pause();
      globalMusic.setAttribute('data-user-muted', 'true');
      const musicToggle = document.getElementById('musicToggle') as HTMLInputElement | null;
      if (musicToggle) musicToggle.checked = false;
    }
  }
}
