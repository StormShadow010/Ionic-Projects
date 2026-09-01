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

  pairs = 2;
  matches = 0;
  attempts = 0;
  bestAttempts = 0;

  cards: Card[] = [];
  firstPick: Card | null = null;
  secondPick: Card | null = null;
  boardLocked = false;

  private flipBackTimer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit() {
    await this.storage.init();
    this.bestAttempts = await this.storage.getBestAttempts();
    this.newGame();
    this.cdr.markForCheck();
  }

  newGame() {
    // Cancela un volteo pendiente si el usuario reinicia a mitad de turno
    if (this.flipBackTimer !== null) {
      clearTimeout(this.flipBackTimer);
      this.flipBackTimer = null;
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

  private async onGameFinish() {
    await this.storage.saveHistory({
      fecha: new Date().toISOString(),
      attempts: this.attempts,
      pairs: this.pairs,
      win: true,
    });

    const isRecord = await this.storage.saveBestAttemptsIfRecord(this.attempts);
    if (isRecord) {
      this.bestAttempts = this.attempts;
    }
    this.cdr.markForCheck();
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
