import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { Room } from "./game";

@Component({
  selector: "wumpus-board",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #viewport
      class="board-viewport"
      [class.fullMap]="revealed()"
      role="img"
      [attr.aria-label]="label()"
    >
      <div
        class="map"
        [style.transform]="'scale(' + scale() + ')'"
        aria-hidden="true"
      >
        @for (row of rooms(); track $index) {
          <div class="row">
            @for (room of row; track $index) {
              <div [class]="classes(room)">
                <span class="objects"></span><span class="blood"></span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class Board implements AfterViewInit, OnDestroy {
  readonly rooms = input.required<Room[][]>();
  readonly revealed = input(false);
  readonly label = input("Cave map. Unexplored rooms are hidden.");
  readonly scale = signal(0);
  private readonly viewport =
    viewChild.required<ElementRef<HTMLElement>>("viewport");
  private observer?: ResizeObserver;

  ngAfterViewInit(): void {
    const element = this.viewport().nativeElement;
    this.scale.set(element.clientWidth / 960);
    this.observer = new ResizeObserver((entries) =>
      this.scale.set(entries[0].contentRect.width / 960),
    );
    this.observer.observe(element);
  }
  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
  classes(room: Room): string {
    if (this.revealed())
      return [...room, "explored-north", "explored-south"].join(" ");
    return room.includes("explored") ? room.join(" ") : "dark";
  }
}
