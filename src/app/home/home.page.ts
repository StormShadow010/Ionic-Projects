import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { Card, Framework } from '../types/Card';
import { StorageService } from '../service/storage';

const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons';
const FLIP_BACK_DELAY = 800;
const ASK_NAME_DELAY = 700; // deja ver la última carta antes de la alerta

/** Fila ya lista para pintar: la fecha viene formateada, no ISO. */
interface HistoryRow {
  nombre: string;
  fecha: string;
  attempts: number;
  pairs: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomePage implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private storage = inject(StorageService);

  frameworks: Framework[] = [
    { name: 'Angular', icon: `${DEVICON}/angular/angular-original.svg` },
    { name: 'React', icon: `${DEVICON}/react/react-original.svg` },
    { name: 'Vue', icon: `${DEVICON}/vuejs/vuejs-original.svg` },
    { name: 'Svelte', icon: `${DEVICON}/svelte/svelte-original.svg` },
    { name: 'Django', icon: `${DEVICON}/django/django-plain.svg` },
    { name: 'Laravel', icon: `${DEVICON}/laravel/laravel-original.svg` },
    { name: 'Flutter', icon: `${DEVICON}/flutter/flutter-original.svg` },
    { name: 'Spring', icon: `${DEVICON}/spring/spring-original.svg` },
    { name: 'Next.js', icon: `${DEVICON}/nextjs/nextjs-original.svg` },
    { name: 'Express', icon: `${DEVICON}/express/express-original.svg` },
    { name: 'Rails', icon: `${DEVICON}/rails/rails-plain.svg` },
    { name: '.NET', icon: `${DEVICON}/dotnetcore/dotnetcore-original.svg` },
    { name: 'Ionic', icon: `${DEVICON}/ionic/ionic-original.svg` },
    { name: 'FastAPI', icon: `${DEVICON}/fastapi/fastapi-original.svg` },
    { name: 'Nuxt', icon: `${DEVICON}/nuxtjs/nuxtjs-original.svg` },
    { name: 'Astro', icon: `${DEVICON}/astro/astro-original.svg` },
  ];

  pairs = 8;
  matches = 0;
  attempts = 0;
  bestAttempts = 0;

  playerName = '';

  cards: Card[] = [];
  firstPick: Card | null = null;
  secondPick: Card | null = null;
  boardLocked = false;

  // ---------- modal de historial ----------
  isHistoryOpen = false;
  history: HistoryRow[] = [];

  // ---------- alerta al terminar ----------
  isNameAlertOpen = false;
  alertInputs: any[] = [];

  alertButtons = [
    {
      text: 'OMITIR',
      role: 'cancel',
      handler: () => {
        this.savePartida('ANÓNIMO');
      },
    },
    {
      text: 'GUARDAR',
      handler: (data: { nombre?: string }) => {
        const nombre = (data.nombre ?? '').trim();
        // devolver false mantiene la alerta abierta si no escribió nada
        if (!nombre) return false;

        this.savePartida(nombre);
        return true;
      },
    },
  ];

  /** Resultado congelado al terminar, por si reinicia mientras responde. */
  private pendingResult: { attempts: number; pairs: number } | null = null;

  private flipBackTimer: ReturnType<typeof setTimeout> | null = null;
  private askNameTimer: ReturnType<typeof setTimeout> | null = null;

  private dateFormatter = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  async ngOnInit() {
    await this.storage.init();
    this.bestAttempts = await this.storage.getBestAttempts();
    this.playerName = await this.storage.getPlayerName();
    this.newGame();
    this.cdr.markForCheck();
  }

  newGame() {
    // Cancela temporizadores pendientes si reinicia a mitad de turno
    if (this.flipBackTimer !== null) {
      clearTimeout(this.flipBackTimer);
      this.flipBackTimer = null;
    }
    if (this.askNameTimer !== null) {
      clearTimeout(this.askNameTimer);
      this.askNameTimer = null;
    }

    this.matches = 0;
    this.attempts = 0;
    this.resetPicks();

    const selected = this.shuffle(this.frameworks).slice(0, this.pairs);

    const deck: Card[] = selected.flatMap<Card>((f, i) => [
      {
        id: i * 2,
        key: 'k' + i,
        name: f.name,
        icon: f.icon,
        revealed: false,
        matched: false,
      },
      {
        id: i * 2 + 1,
        key: 'k' + i,
        name: f.name,
        icon: f.icon,
        revealed: false,
        matched: false,
      },
    ]);

    this.cards = this.shuffle(deck);
  }

  onCardClick(card: Card) {
    if (this.boardLocked || card.revealed || card.matched) return;

    card.revealed = true;

    // Primera carta del turno
    if (!this.firstPick) {
      this.firstPick = card;
      return;
    }

    // Segunda carta: se cierra el turno
    this.secondPick = card;
    this.attempts++;
    this.boardLocked = true;

    if (this.firstPick.key === this.secondPick.key) {
      this.firstPick.matched = true;
      this.secondPick.matched = true;
      this.matches++;
      this.resetPicks();

      if (this.finished) {
        this.onGameFinish();
      }
    } else {
      // Guardo las referencias en constantes locales: cuando el timer
      // dispare, this.firstPick ya podría ser null
      const a = this.firstPick;
      const b = this.secondPick;

      this.flipBackTimer = setTimeout(() => {
        a.revealed = false;
        b.revealed = false;
        this.resetPicks();
        this.flipBackTimer = null;
        this.cdr.markForCheck(); // avisa a Angular que repinte
      }, FLIP_BACK_DELAY);
    }
  }

  // ---------- fin de partida ----------

  private onGameFinish() {
    this.pendingResult = { attempts: this.attempts, pairs: this.pairs };

    // El input se arma justo antes de abrir para precargar el último nombre
    this.alertInputs = [
      {
        name: 'nombre',
        type: 'text',
        placeholder: 'Nombre del jugador',
        value: this.playerName,
        attributes: { maxlength: 20 },
      },
    ];

    this.askNameTimer = setTimeout(() => {
      this.isNameAlertOpen = true;
      this.askNameTimer = null;
      this.cdr.markForCheck();
    }, ASK_NAME_DELAY);
  }

  /** Escribe la partida en el historial y actualiza el récord. */
  private async savePartida(nombre: string) {
    const result = this.pendingResult;
    if (!result) return;
    this.pendingResult = null;

    if (nombre !== 'ANÓNIMO') {
      this.playerName = nombre;
      await this.storage.savePlayerName(nombre);
    }

    await this.storage.saveHistory({
      nombre,
      fecha: new Date().toISOString(),
      attempts: result.attempts,
      pairs: result.pairs,
      win: true,
    });

    const isRecord = await this.storage.saveBestAttemptsIfRecord(
      result.attempts,
    );
    if (isRecord) {
      this.bestAttempts = result.attempts;
    }

    // Si el modal está abierto, que se vea la partida recién guardada
    if (this.isHistoryOpen) {
      await this.loadHistory();
    }
    this.cdr.markForCheck();
  }

  onNameAlertDismiss() {
    this.isNameAlertOpen = false;
    this.cdr.markForCheck();
  }

  // ---------- historial ----------

  async openHistory() {
    await this.loadHistory();
    this.isHistoryOpen = true;
    this.cdr.markForCheck();
  }

  closeHistory() {
    this.isHistoryOpen = false;
    this.cdr.markForCheck();
  }

  private async loadHistory() {
    const raw = await this.storage.getHistory();

    this.history = raw
      .map((h) => ({
        nombre: h.nombre || 'ANÓNIMO',
        fecha: this.formatDate(h.fecha),
        attempts: h.attempts,
        pairs: h.pairs ?? 0,
        // se conserva el ISO solo para desempatar el orden
        ts: new Date(h.fecha).getTime() || 0,
      }))
      .sort((a, b) => a.attempts - b.attempts || b.ts - a.ts);
  }
  /** "07 sept 2026, 03:45 p. m." */
  private formatDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : this.dateFormatter.format(d);
  }

  private resetPicks() {
    this.firstPick = null;
    this.secondPick = null;
    this.boardLocked = false;
  }

  get finished(): boolean {
    return this.matches === this.pairs;
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
