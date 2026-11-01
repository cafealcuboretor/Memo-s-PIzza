import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Definimos la estructura de cada tarjeta de notificación
export interface FazAlert {
  id: number;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'success';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Arreglo reactivo que contiene las alertas activas en pantalla
  private alertsSubject = new BehaviorSubject<FazAlert[]>([]);
  alerts$ = this.alertsSubject.asObservable();

  /**
   * Dispara una alerta en pantalla
   * @param message Texto descriptivo
   * @param title Título en mayúsculas estilo monitor
   * @param type Color del borde y luz ('danger' | 'warning' | 'success')
   * @param duration Milisegundos antes de autodestruirse (por defecto 3.5 segundos)
   */
  show(message: string, title = 'FAZBEAR SECURITY SYSTEM', type: 'danger' | 'warning' | 'success' = 'warning', duration = 3500) {
    const id = Date.now();
    const newAlert: FazAlert = { id, title, message, type };

    // Añadimos la alerta a la lista
    this.alertsSubject.next([...this.alertsSubject.value, newAlert]);

    // Timer para removerla automáticamente
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  // Quita una alerta manualmente (por ejemplo si el usuario le da a la X)
  remove(id: number) {
    const updated = this.alertsSubject.value.filter(a => a.id !== id);
    this.alertsSubject.next(updated);
  }
}