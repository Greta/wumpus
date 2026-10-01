import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

@Component({
  selector: "wumpus-clue-text",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (part of parts(); track $index) {
    <span [class]="part.tone">{{ part.text }}</span>
  }`,
})
export class ClueText {
  readonly text = input.required<string>();
  readonly parts = computed(() =>
    this.text()
      .split(/\b(blood|wumpus|slime|pitfalls?|pits?|bats?)\b/gi)
      .map((text) => {
        const word = text.toLowerCase();
        const tone = /^(pitfalls?|pits?)$/.test(word)
          ? "pit"
          : /^bats?$/.test(word)
            ? "bat"
            : /^(blood|wumpus|slime)$/.test(word)
              ? word
              : "";
        return { text, tone: tone ? `clue-${tone}` : "" };
      }),
  );
}
