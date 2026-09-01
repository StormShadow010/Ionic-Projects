import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Storage } from '@ionic/storage-angular';

export interface PartidaHistorial {
  fecha: string;
  attempts: number;
  pairs: number;
  win: boolean;
}

const KEY_BEST = 'bestAttempts';
const KEY_HISTORY = 'history';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private ionicStorage: Storage | null = null;
  private ready: Promise<void> | null = null;

  /** Crea la base de datos. Seguro de llamar varias veces. */
  init(): Promise<void> {
    if (!this.ready) {
      this.ready = new Storage().create().then((s) => {
        this.ionicStorage = s;
      });
    }
    return this.ready;
  }

  // ---------- Nivel 1: Preferences (valor simple) ----------

  async getBestAttempts(): Promise<number> {
    const { value } = await Preferences.get({ key: KEY_BEST });
    return value ? Number(value) : 0;
  }

  async saveBestAttemptsIfRecord(attempts: number): Promise<boolean> {
    const current = await this.getBestAttempts();
    const isRecord = current === 0 || attempts < current;

    if (isRecord) {
      await Preferences.set({ key: KEY_BEST, value: String(attempts) });
    }
    return isRecord;
  }

  // ---------- Nivel 2: Storage (datos estructurados) ----------

  async saveHistory(entry: PartidaHistorial): Promise<void> {
    await this.init();
    const history = await this.getHistory();
    history.unshift(entry); // la más reciente de primera
    await this.ionicStorage!.set(KEY_HISTORY, history);
  }

  async getHistory(): Promise<PartidaHistorial[]> {
    await this.init();
    return (await this.ionicStorage!.get(KEY_HISTORY)) ?? [];
  }

  async clearAll(): Promise<void> {
    await this.init();
    await this.ionicStorage!.remove(KEY_HISTORY);
    await Preferences.remove({ key: KEY_BEST });
  }
}
