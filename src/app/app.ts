import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { Board } from "./board";
import { ClueText } from "./clue-text";
import { Direction, Game } from "./game";

@Component({
  selector: "wumpus-app",
  imports: [Board, ClueText],
  templateUrl: "./app.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:keydown)": "onKey($event)" },
})
export class App implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly revision = signal(0);
  readonly game = new Game(Math.random, () =>
    this.revision.update((v) => v + 1),
  );
  readonly state = computed(() => {
    this.revision();
    return {
      rooms: this.game.map.map((row) => row.map((room) => [...room])),
      aiming: this.game.aiming,
      phase: this.game.phase,
      ended: this.game.ended,
      result: this.game.result,
      score: { ...this.game.score },
      description: this.game.description,
    };
  });
  readonly mapOpen = signal(false);
  private readonly mapDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>("mapDialog");
  private readonly retry = viewChild<ElementRef<HTMLButtonElement>>("retry");
  private readonly aim =
    viewChild.required<ElementRef<HTMLButtonElement>>("aim");
  private readonly gameScreen =
    viewChild.required<ElementRef<HTMLElement>>("gameScreen");

  constructor() {
    effect(() => {
      this.retry()?.nativeElement.focus();
    });
  }
  move(dir: Direction): void {
    this.game.move(dir);
  }
  toggleAim(): void {
    this.game.toggleAim();
  }
  restart(): void {
    this.closeMap();
    this.game.newGame();
    afterNextRender(
      () => {
        const aim = this.aim().nativeElement;
        (aim.getClientRects().length
          ? aim
          : this.gameScreen().nativeElement
        ).focus({ preventScroll: true });
      },
      {
        injector: this.injector,
      },
    );
  }
  openMap(): void {
    if (!this.game.ended) return;
    this.mapOpen.set(true);
    this.mapDialog().nativeElement.showModal();
  }
  closeMap(): void {
    this.mapDialog().nativeElement.close();
    this.mapOpen.set(false);
  }
  onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (
      target?.closest(
        'input, textarea, select, [contenteditable="true"], a, summary',
      )
    )
      return;
    if (this.mapOpen()) {
      if (event.code === "KeyM") {
        event.preventDefault();
        this.closeMap();
      }
      return;
    }
    const directions: Record<string, Direction> = {
      ArrowUp: "north",
      Numpad8: "north",
      ArrowDown: "south",
      Numpad2: "south",
      ArrowLeft: "west",
      Numpad4: "west",
      ArrowRight: "east",
      Numpad6: "east",
    };
    if (directions[event.code]) {
      event.preventDefault();
      this.move(directions[event.code]);
    } else if (event.code === "KeyF") {
      event.preventDefault();
      this.toggleAim();
    } else if (event.code === "Escape" && this.game.aiming) {
      event.preventDefault();
      this.toggleAim();
    } else if (event.code === "KeyM" && this.game.ended) {
      event.preventDefault();
      this.openMap();
    } else if (
      event.code === "Enter" &&
      this.game.ended &&
      !target?.closest("button")
    ) {
      event.preventDefault();
      this.restart();
    }
  }
  ngOnDestroy(): void {
    this.game.dispose();
  }
}
