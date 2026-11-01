import { Component, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface NewspaperArticle {
  id: number;
  edition: string;
  headline: string;
  subheadline: string;
  date: string;
  content: string[];
  tag: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements AfterViewInit {
  isVideoMuted = true;
  selectedArticle: NewspaperArticle | null = null;

  articles: NewspaperArticle[] = [
    {
      id: 1,
      edition: 'Edición Nocturna #01',
      headline: '¡NUEVA PLATAFORMA DIGITAL EN LÍNEA!',
      subheadline: 'Memo\'s Pizza moderniza sus pedidos para el turno nocturno',
      date: 'Septiembre 2026',
      tag: 'NOVEDAD',
      content: [
        'Presentamos nuestra nueva experiencia en línea con carrito reactivo y sistema de telón dinámico.',
        'Ahora puedes asegurar tus rebanadas favoritas antes de que comience el patrullaje de medianoche.'
      ]
    },
    {
      id: 2,
      edition: 'Crónica Gastronómica #02',
      headline: 'LA RECETA SECRETA DE LA SALSA',
      subheadline: 'Tomates seleccionados y especias de la casa',
      date: 'Agosto 2026',
      tag: 'COCINA',
      content: [
        'Nuestra masa fermentada durante 48 horas garantiza una base crujiente capaz de resistir cualquier orilla rellena.',
        'El queso 100% mozzarella fresco funde a la perfección en cada bocado.'
      ]
    },
    {
      id: 3,
      edition: 'Aviso de Mantenimiento #03',
      headline: 'SISTEMA DE SEGURIDAD CCTV RENOVADO',
      subheadline: 'Próxima integración con el módulo Tracker',
      date: 'Agosto 2026',
      tag: 'TECNOLOGÍA',
      content: [
        'Los monitores de preparación pronto te permitirán rastrear el estado de tu orden en tiempo real.',
        'Recuerda vigilar el consumo de batería de tu dispositivo mientras monitoreas las cámaras.'
      ]
    },
    {
      id: 4,
      edition: 'Boletín del Personal #04',
      headline: 'VACANTE: VIGILANTE NOCTURNO',
      subheadline: 'Turno de 12:00 AM a 6:00 AM',
      date: 'Julio 2026',
      tag: 'EMPLEO',
      content: [
        'Se busca personal responsable para supervisión de cámaras, inventario de pizzas e inspección de animatrónicos.',
        'Pizza ilimitada incluida durante la guardia. Se sugiere no apagar los ventiladores.'
      ]
    },
    {
      id: 5,
      edition: 'Sección Gourmet #05',
      headline: 'EL CUPCAKE DE CHICA SE UNE AL MENÚ',
      subheadline: 'El postre favorito de los comensales ya disponible',
      date: 'Junio 2026',
      tag: 'POSTRES',
      content: [
        'Glaseado rosa suave, chispas artesanales y una vela decorativa que nunca se apaga.',
        'Pídelo individualmente o en cualquiera de nuestros combos de supervivencia.'
      ]
    },
    {
      id: 6,
      edition: 'Comunidad #06',
      headline: 'PROGRAMA DE RECOMPENSAS NOCTURNAS',
      subheadline: 'Descuentos exclusivos para clientes frecuentes',
      date: 'Mayo 2026',
      tag: 'BENEFICIOS',
      content: [
        'Cada pedido realizado después de las 9:00 PM acumula puntos canjeables por guarniciones y bebidas.',
        'Consulta los paquetes exclusivos en la sección de Promos cada fin de semana.'
      ]
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  openArticle(article: NewspaperArticle) {
    this.selectedArticle = article;
  }

  closeArticle() {
    this.selectedArticle = null;
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('active');
            }
          });
        }, { threshold: 0.10 });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
      }, 100);
    }
  }

  toggleVideoMute() {
    if (isPlatformBrowser(this.platformId)) {
      const video = document.getElementById('promo-video') as HTMLVideoElement;
      if (video) {
        video.muted = !video.muted;
        this.isVideoMuted = video.muted;
        const globalMusic = document.getElementById('global-music') as HTMLAudioElement;
        if (globalMusic && !this.isVideoMuted) {
          globalMusic.pause();
          globalMusic.setAttribute('data-user-muted', 'true');
          const musicToggle = document.getElementById('musicToggle') as HTMLInputElement;
          if (musicToggle) {
            musicToggle.checked = false;
          }
        }
      }
    }
  }
}