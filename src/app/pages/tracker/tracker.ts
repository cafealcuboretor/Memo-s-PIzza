import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService, DeliveryData } from '../../services/cart';

interface TrackingStep {
  step: number;
  label: string;
  camId: string;
  camName: string;
  statusText: string;
  detail: string;
}

@Component({
  selector: 'app-tracker',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tracker.html',
  styleUrl: './tracker.css'
})
export class Tracker implements OnInit {
  deliveryInfo: DeliveryData | null = null;
  currentStepIndex = 1; // 0: Orden Recibida, 1: En Horno, 2: Empaquetado, 3: En Camino, 4: Entregado
  selectedCam = 'CAM-02';

  steps: TrackingStep[] = [
    { step: 0, label: 'COCINA', camId: 'CAM-01', camName: 'PREPARACIÓN DE MASA', statusText: 'Orden confirmada y receta armada', detail: 'Masa estirada con salsa especial y queso fresco.' },
    { step: 1, label: 'HORNOS', camId: 'CAM-02', camName: 'ÁREA DE COCCIÓN', statusText: 'Horneándose a 300°C', detail: 'Vigilando la temperatura en el sector central.' },
    { step: 2, label: 'EMPAQUE', camId: 'CAM-03', camName: 'MESA DE CALIDAD', statusText: 'Inspección de orillas y corte', detail: 'Cajas selladas y sellos de seguridad intactos.' },
    { step: 3, label: 'PATRULLA', camId: 'CAM-04', camName: 'RUTA EXTERIOR', statusText: 'Repartidor en trayecto nocturno', detail: 'Evitando callejones oscuros y cortes de energía.' },
    { step: 4, label: 'LLEGADA', camId: 'CAM-05', camName: 'PUERTA DE SEGURIDAD', statusText: 'Pedido entregado en destino', detail: 'Toca la bocina 2 veces. Turno completado.' }
  ];

  cctvStatic = false;

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.cartService.delivery$.subscribe(data => {
      this.deliveryInfo = data;
    });
  }

  // Cambiar manualmente de cámara o según el progreso
  switchCam(camId: string, stepIndex?: number) {
    this.cctvStatic = true;
    setTimeout(() => {
      this.selectedCam = camId;
      if (stepIndex !== undefined) {
        this.currentStepIndex = stepIndex;
      }
      this.cctvStatic = false;
    }, 180);
  }

  nextStatus() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.switchCam(this.steps[this.currentStepIndex].camId);
    }
  }

  prevStatus() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.switchCam(this.steps[this.currentStepIndex].camId);
    }
  }

  get currentStep(): TrackingStep {
    return this.steps[this.currentStepIndex];
  }
}