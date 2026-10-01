export type Direction = "north" | "south" | "east" | "west";
export type Point = { x: number; y: number };
export type Room = string[];
export type Phase = "playing" | "caught" | "won" | "lost";
export type Score = { player: number; wumpus: number; pitfall: number };
export type Result = { title: string; message: string };
export const DIRECTIONS: Record<Direction, readonly [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

/** The original 8 by 6 cave rules, independent of rendering and input method. */
export class Game {
  readonly cols = 8;
  readonly rows = 6;
  map: Room[][] = [];
  player: Point = { x: 0, y: 0 };
  lastDir: Direction | null = null;
  phase: Phase = "playing";
  score: Score = { player: 0, wumpus: 0, pitfall: 0 };
  result: Result | null = null;
  private batTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly random = Math.random,
    private readonly changed = () => {},
  ) {
    this.newGame();
  }

  get room(): Room {
    return this.map[this.player.y][this.player.x];
  }
  get aiming(): boolean {
    return this.phase === "playing" && this.room.includes("aiming");
  }
  get ended(): boolean {
    return this.phase === "won" || this.phase === "lost";
  }

  private integer(min: number, max: number): number {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  newGame(): void {
    this.dispose();
    this.phase = "playing";
    this.result = null;
    this.lastDir = null;
    this.map = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => []),
    );
    const empty = this.map.flatMap((row, y) => row.map((_, x) => ({ x, y })));
    for (let i = empty.length - 1; i > 0; i--) {
      const j = this.integer(0, i);
      [empty[i], empty[j]] = [empty[j], empty[i]];
    }
    const tunnels = empty.splice(0, this.integer(7, 10));
    const wumpus = empty.pop()!;
    const pits = empty.splice(0, 2);
    const bats = empty.splice(0, 2);
    this.player = empty.pop()!;
    tunnels.forEach((p) =>
      this.map[p.y][p.x].push(this.random() < 0.5 ? "nw" : "ne"),
    );
    pits.forEach((p) => this.map[p.y][p.x].push("pitfall"));
    bats.forEach((p) => this.map[p.y][p.x].push("bat"));
    this.room.push("player", "explored", "start");
    this.map[wumpus.y][wumpus.x].push("wumpus");
    this.markNearby(wumpus, "blood");
    pits.forEach((p) => this.markNearby(p, "slime"));
    this.changed();
  }

  opposite(dir: Direction): Direction {
    return (
      { north: "south", south: "north", east: "west", west: "east" } as const
    )[dir];
  }

  tunnelDirection(dir: Direction, tunnel: string): Direction {
    const ne = {
      north: "west",
      south: "east",
      west: "north",
      east: "south",
    } as const;
    const nw = {
      north: "east",
      south: "west",
      west: "south",
      east: "north",
    } as const;
    return (tunnel === "ne" ? ne : nw)[dir];
  }

  nextRoom(from: Point, direction: Direction, followTunnels = false): Point {
    let point = from;
    let dir = direction;
    const visited = new Set<string>();
    while (true) {
      point = {
        x: (point.x + DIRECTIONS[dir][0] + this.cols) % this.cols,
        y: (point.y + DIRECTIONS[dir][1] + this.rows) % this.rows,
      };
      const tunnel = this.map[point.y][point.x].find(
        (t) => t === "ne" || t === "nw",
      );
      if (!followTunnels || !tunnel) return point;
      const key = `${point.x},${point.y},${dir}`;
      // A randomly generated tunnel loop must never lock up the game.
      if (visited.has(key)) return point;
      visited.add(key);
      dir = this.tunnelDirection(dir, tunnel);
    }
  }

  private markNearby(
    from: Point,
    type: "blood" | "slime",
    entered?: Direction,
  ): void {
    for (const dir of Object.keys(DIRECTIONS) as Direction[]) {
      if (entered && dir === this.opposite(entered)) continue;
      const point = this.nextRoom(from, dir, true);
      const room = this.map[point.y][point.x];
      if (!room.includes(type))
        room.push(type, `${type}-${this.integer(1, 10)}`);
      if (!entered && type === "blood") this.markNearby(point, type, dir);
    }
  }

  canMove(dir: Direction): boolean {
    if (this.phase !== "playing") return false;
    const tunnel = this.room.find((t) => t === "ne" || t === "nw");
    return (
      !tunnel ||
      !this.lastDir ||
      (dir !== this.lastDir &&
        dir !== this.opposite(this.tunnelDirection(this.lastDir, tunnel)))
    );
  }

  move(dir: Direction): void {
    if (!this.canMove(dir)) return;
    const target = this.nextRoom(this.player, dir);
    const room = this.map[target.y][target.x];
    if (this.aiming) {
      if (room.includes("wumpus")) {
        this.complete(
          "player",
          "YOU DID IT.",
          "The wumpus's thick hide was pierced by your arrow. The smell of its liberated viscera slowly fills the air. You smile.",
        );
      } else {
        this.complete(
          "wumpus",
          "YOU DIED.",
          "You have loosed your only arrow and you cannot find it in the darkness. Your panicked stumbling summons the wumpus. It leaves nothing to waste.",
        );
      }
      return;
    }
    this.removePlayer();
    this.player = target;
    this.add(this.room, "player", "explored");
    const tunnel = room.find((t) => t === "ne" || t === "nw");
    if (tunnel) {
      const south =
        tunnel === "ne"
          ? dir === "east" || dir === "north"
          : dir === "west" || dir === "north";
      this.add(
        room,
        `explored-${south ? "south" : "north"}`,
        `player-${south ? "south" : "north"}`,
      );
    }
    this.lastDir = dir;
    this.checkRoom();
    this.changed();
  }

  toggleAim(): void {
    if (this.phase !== "playing") return;
    const i = this.room.indexOf("aiming");
    if (i >= 0) this.room.splice(i, 1);
    else this.room.push("aiming");
    this.changed();
  }

  private removePlayer(): void {
    this.map[this.player.y][this.player.x] = this.room.filter(
      (t) =>
        t !== "player" &&
        !t.startsWith("player-") &&
        t !== "aiming" &&
        t !== "caught",
    );
  }

  private add(room: Room, ...attributes: string[]): void {
    for (const attr of attributes) if (!room.includes(attr)) room.push(attr);
  }

  private checkRoom(): void {
    if (this.room.includes("wumpus")) {
      this.complete(
        "wumpus",
        "YOU DIED.",
        "The fashion of your death can only be matched by the most vivid of childhood nightmares.",
      );
    } else if (this.room.includes("pitfall")) {
      this.complete(
        "pitfall",
        "YOU DIED.",
        "The last thing you hear is the sickening crunch of your bones, when the floor of the pit rushes up to greet you.",
      );
    } else if (this.room.includes("bat") && this.random() >= 0.5) {
      this.phase = "caught";
      this.add(this.room, "caught");
      this.batTimer = setTimeout(() => this.batDrop(), 1000);
    }
  }

  private batDrop(): void {
    this.batTimer = undefined;
    this.map[this.player.y][this.player.x] = this.room.filter(
      (t) => t !== "bat",
    );
    this.removePlayer();
    // Bats drop you in a room, never halfway into a tunnel.
    const rooms = this.map.flatMap((row, y) =>
      row.flatMap((r, x) =>
        r.includes("ne") || r.includes("nw") ? [] : [{ x, y }],
      ),
    );
    this.player = rooms[this.integer(0, rooms.length - 1)];
    this.add(this.room, "player", "explored");
    this.lastDir = null;
    this.phase = "playing";
    this.checkRoom();
    this.changed();
  }

  private complete(winner: keyof Score, title: string, message: string): void {
    if (this.ended) return;
    this.score[winner]++;
    this.phase = winner === "player" ? "won" : "lost";
    this.result = { title, message };
    this.changed();
  }

  get description(): string {
    if (this.phase === "caught") return "A bat has caught you. Hold on…";
    if (this.ended) return this.result!.title;
    const clues = [];
    if (this.room.includes("blood"))
      clues.push("Blood nearby. The wumpus is close.");
    if (this.room.includes("slime"))
      clues.push("Slime underfoot. Watch for a pit.");
    if (this.room.includes("bat")) clues.push("A bat is watching you.");
    if (this.room.includes("ne") || this.room.includes("nw"))
      clues.push("Follow the bend in the tunnel.");
    return `Room ${String.fromCharCode(65 + this.player.x)}${this.player.y + 1}. ${clues.join(" ") || "The cave is quiet."}`;
  }

  dispose(): void {
    if (this.batTimer !== undefined) clearTimeout(this.batTimer);
    this.batTimer = undefined;
  }
}
