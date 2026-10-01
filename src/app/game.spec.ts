import { afterEach, describe, expect, it, vi } from "vitest";
import { Direction, Game } from "./game";

function emptyGame(random = () => 0.25): Game {
  const game = new Game(random);
  game.map = Array.from({ length: 6 }, () =>
    Array.from({ length: 8 }, () => []),
  );
  game.player = { x: 3, y: 3 };
  game.room.push("player", "explored", "start");
  return game;
}

afterEach(() => vi.useRealTimers());

describe("Cave generation", () => {
  it("keeps the original 8 by 6 cave, hazards, tunnels, and safe starting room", () => {
    const game = new Game();
    const rooms = game.map.flat();
    expect(game.map).toHaveLength(6);
    expect(game.map.every((row) => row.length === 8)).toBe(true);
    expect(rooms.filter((room) => room.includes("wumpus"))).toHaveLength(1);
    expect(rooms.filter((room) => room.includes("bat"))).toHaveLength(2);
    expect(rooms.filter((room) => room.includes("pitfall"))).toHaveLength(2);
    const tunnels = rooms.filter(
      (room) => room.includes("ne") || room.includes("nw"),
    );
    expect(tunnels.length).toBeGreaterThanOrEqual(7);
    expect(tunnels.length).toBeLessThanOrEqual(10);
    expect(game.room).toEqual(
      expect.arrayContaining(["player", "start", "explored"]),
    );
    expect(
      game.room.some((t) =>
        ["wumpus", "pitfall", "bat", "ne", "nw"].includes(t),
      ),
    ).toBe(false);
    expect(rooms.filter((room) => room.includes("explored"))).toHaveLength(1);
  });

  it("marks pit warnings at connected neighboring rooms", () => {
    const game = new Game();
    game.map.forEach((row, y) =>
      row.forEach((room, x) => {
        if (room.includes("pitfall")) {
          for (const dir of ["north", "south", "east", "west"] as Direction[]) {
            const nearby = game.nextRoom({ x, y }, dir, true);
            expect(game.map[nearby.y][nearby.x]).toContain("slime");
          }
        }
      }),
    );
  });
});

describe("Movement and aiming", () => {
  it.each([
    ["north", { x: 3, y: 2 }],
    ["south", { x: 3, y: 4 }],
    ["east", { x: 4, y: 3 }],
    ["west", { x: 2, y: 3 }],
  ] as const)("moves %s and reveals only the entered room", (dir, point) => {
    const game = emptyGame();
    game.move(dir);
    expect(game.player).toEqual(point);
    expect(game.room).toEqual(expect.arrayContaining(["player", "explored"]));
    expect(game.map[3][3]).not.toContain("player");
    expect(
      game.map.flat().filter((room) => room.includes("player")),
    ).toHaveLength(1);
    expect(
      game.map.flat().filter((room) => room.includes("explored")),
    ).toHaveLength(2);
  });

  it("wraps at all four edges", () => {
    const game = emptyGame();
    expect(game.nextRoom({ x: 0, y: 0 }, "west")).toEqual({ x: 7, y: 0 });
    expect(game.nextRoom({ x: 0, y: 0 }, "north")).toEqual({ x: 0, y: 5 });
    expect(game.nextRoom({ x: 7, y: 5 }, "east")).toEqual({ x: 0, y: 5 });
    expect(game.nextRoom({ x: 7, y: 5 }, "south")).toEqual({ x: 7, y: 0 });
  });

  it.each(["ne", "nw"])(
    "preserves the %s tunnel bend and blocks movement through its walls",
    (tunnel) => {
      const game = emptyGame();
      game.map[2][3].push(tunnel);
      game.move("north");
      expect(game.room).toContain("explored-south");
      expect(game.canMove("north")).toBe(false);
      expect(game.canMove("south")).toBe(true);
      expect(game.canMove(tunnel === "ne" ? "west" : "east")).toBe(true);
      expect(game.canMove(tunnel === "ne" ? "east" : "west")).toBe(false);
      game.move("north");
      expect(game.player).toEqual({ x: 3, y: 2 });
    },
  );

  it("wins with one shot into the adjacent wumpus room and counts it once", () => {
    const game = emptyGame();
    game.map[2][3].push("wumpus");
    game.toggleAim();
    game.move("north");
    expect(game.phase).toBe("won");
    expect(game.player).toEqual({ x: 3, y: 3 });
    game.move("north");
    game.toggleAim();
    expect(game.score.player).toBe(1);
  });

  it("loses the hunt after a missed arrow", () => {
    const game = emptyGame();
    game.toggleAim();
    game.move("east");
    expect(game.phase).toBe("lost");
    expect(game.score.wumpus).toBe(1);
  });

  it("can cancel aim and resume moving", () => {
    const game = emptyGame();
    game.toggleAim();
    game.toggleAim();
    game.move("east");
    expect(game.phase).toBe("playing");
    expect(game.player.x).toBe(4);
  });

  it.each(["pitfall", "wumpus"] as const)(
    "ends a hunt on entering a %s",
    (hazard) => {
      const game = emptyGame();
      game.map[3][4].push(hazard);
      game.move("east");
      expect(game.phase).toBe("lost");
      expect(game.score[hazard]).toBe(1);
      game.newGame();
      expect(game.phase).toBe("playing");
      expect(game.result).toBeNull();
      expect(game.lastDir).toBeNull();
      expect(game.aiming).toBe(false);
      expect(game.score[hazard]).toBe(1);
    },
  );
});

describe("Bat transport", () => {
  it("locks all input while carried, then drops the player into a room", () => {
    vi.useFakeTimers();
    const game = emptyGame(() => 0.75);
    game.map[3][4].push("bat");
    game.move("east");
    expect(game.phase).toBe("caught");
    game.move("north");
    game.toggleAim();
    expect(game.player).toEqual({ x: 4, y: 3 });
    expect(game.aiming).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(game.phase).toBe("playing");
    expect(game.map.flat().filter((r) => r.includes("player"))).toHaveLength(1);
    expect(game.room).not.toContain("caught");
  });

  it("cancels pending transport on restart and disposal", () => {
    vi.useFakeTimers();
    const game = emptyGame(() => 0.75);
    game.map[3][4].push("bat");
    game.move("east");
    game.newGame();
    const start = { ...game.player };
    vi.advanceTimersByTime(2000);
    expect(game.player).toEqual(start);
    expect(game.phase).toBe("playing");
    game.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
