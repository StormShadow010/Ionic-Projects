import { Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonTextarea,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, locationOutline } from 'ionicons/icons';
import { Camera, MediaResult } from '@capacitor/camera';
import { Coordinates } from '../../models/photo-record';

export interface PhotoFormData {
  photo: MediaResult;
  description: string;
}

@Component({
  selector: 'app-photo-form',
  templateUrl: './photo-form.component.html',
  styleUrl: './photo-form.component.scss',
  host: { class: 'ion-page' },
  imports: [IonContent, IonButton, IonIcon, IonTextarea, DecimalPipe],
})
export class PhotoForm {
  // Punto del mapa donde se tomará la foto
  readonly position = input.required<Coordinates>();

  // Avisa al padre que el usuario canceló
  readonly cancelled = output<void>();
  // Avisa al padre que el usuario guardó la foto
  readonly saved = output<PhotoFormData>();

  // Foto tomada (null hasta que se tome una)
  protected photo = signal<MediaResult | null>(null);

  // Descripción ingresada por el usuario
  protected description = signal('');

  // true solo si hay foto Y una descripción con texto real
  protected canSave = computed(
    () => this.photo() !== null && this.description().trim().length > 0,
  );

  constructor() {
    // Registra los íconos que usa esta plantilla
    addIcons({ cameraOutline, locationOutline });
  }
  // Abre la cámara y guarda el resultado
  protected async takePhoto() {
    try {
      const result = await Camera.takePhoto({ quality: 80 });
      this.photo.set(result);
      console.log('Foto tomada:', result);
    } catch (e) {
      // Cerrar la cámara sin tomar foto también lanza error: no es un fallo de la app
      console.log('Cámara cancelada o con error:', e);
    }
  }
  //
  protected save() {
    const photo = this.photo();
    if (!photo || !this.canSave()) return;

    this.saved.emit({
      photo,
      description: this.description().trim(),
    });
  }
}
