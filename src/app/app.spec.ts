import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  TestBed.configureTestingModule({ imports: [App] });
});

describe("Game screen controls", () => {
  it("uses the same movement and aiming actions for buttons and keyboard", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const move = vi
      .spyOn(fixture.componentInstance.game, "move")
      .mockImplementation(() => {});
    const aim = vi.spyOn(fixture.componentInstance.game, "toggleAim");
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('[aria-label="Move north"]')!.click();
    expect(move).toHaveBeenCalledWith("north");
    const event = new KeyboardEvent("keydown", {
      code: "ArrowLeft",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(move).toHaveBeenCalledWith("west");
    expect(event.defaultPrevented).toBe(true);
    host.querySelector<HTMLButtonElement>(".aim-button")!.click();
    expect(aim).toHaveBeenCalled();
    fixture.destroy();
  });

  it("shows the armed state and lets Escape cancel without firing", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>(".aim-button")!.click();
    await fixture.whenStable();
    expect(
      host.querySelector(".aim-button")!.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(host.querySelector('[aria-label="Fire east"]')).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { code: "Escape", bubbles: true }),
    );
    await fixture.whenStable();
    expect(
      host.querySelector(".aim-button")!.getAttribute("aria-pressed"),
    ).toBe("false");
    expect(fixture.componentInstance.game.ended).toBe(false);
    fixture.destroy();
  });

  it("leaves modified shortcuts alone and prevents premature map reveals", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const before = { ...fixture.componentInstance.game.player };
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "ArrowLeft",
        ctrlKey: true,
        bubbles: true,
      }),
    );
    fixture.componentInstance.openMap();
    expect(fixture.componentInstance.game.player).toEqual(before);
    expect(fixture.componentInstance.mapOpen()).toBe(false);
    fixture.destroy();
  });
});
