export interface Wall {
  x: number;
  y: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
  r?: number;
  shape?: 'circle' | 'rect';
}

export interface MapData {
  walls?: Wall[];
  lowObstacles?: Wall[];
}

export class PhysicsUtils {
  static isColliding(cx: number, cy: number, radius: number, mapData: MapData, worldSize: number = 2048, margin: number = 0): boolean {
    const rm = radius + margin;
    // 1. World bounds check
    if (cx < rm || cx > worldSize - rm || cy < rm || cy > worldSize - rm) return true;

    if (!mapData) return false;

    const checkList = (list: Wall[] = []) => {
      for (const w of list) {
        if (w.shape === 'circle' || (w.r !== undefined && (w.w === undefined && w.width === undefined))) {
          const distSq = (cx - (w.x || 0)) ** 2 + (cy - (w.y || 0)) ** 2;
          const minDist = rm + (w.r || 0);
          if (distSq <= minDist * minDist) return true;
        } else {
          const ww = w.w ?? w.width ?? 0;
          const wh = w.h ?? w.height ?? 0;
          const nx = Math.max(w.x, Math.min(cx, w.x + ww));
          const ny = Math.max(w.y, Math.min(cy, w.y + wh));
          const distSq = (cx - nx) ** 2 + (cy - ny) ** 2;
          if (distSq <= rm * rm) return true;
        }
      }
      return false;
    };

    if (checkList(mapData.walls)) return true;
    if (checkList(mapData.lowObstacles)) return true;
    return false;
  }

  /** Precise resolution: projects the player to the nearest safe boundary with 2.0px buffer */
  static resolveCollision(cx: number, cy: number, radius: number, mapData: MapData, worldSize: number = 2048): { x: number, y: number } {
    let nx = cx, ny = cy;
    const margin = 2.0;
    const rm = radius + margin;

    // 1. World bounds projection
    if (nx < rm) nx = rm;
    if (nx > worldSize - rm) nx = worldSize - rm;
    if (ny < rm) ny = rm;
    if (ny > worldSize - rm) ny = worldSize - rm;

    if (!mapData) return { x: nx, y: ny };

    // 2. Objects projection
    const resolveList = (list: Wall[] = []) => {
      for (const w of list) {
        if (w.shape === 'circle' || (w.r !== undefined && (w.w === undefined && w.width === undefined))) {
          const wx = w.x || 0, wy = w.y || 0, wr = w.r || 0;
          const dx = nx - wx, dy = ny - wy;
          const distSq = dx * dx + dy * dy;
          const minDist = radius + wr;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            if (dist < 0.001) { // Exactly on top? Nudge up.
              ny -= (radius + wr + margin);
            } else {
              const unitX = dx / dist, unitY = dy / dist;
              nx = wx + unitX * (minDist + margin);
              ny = wy + unitY * (minDist + margin);
            }
          }
        } else {
          const wx = w.x, wy = w.y;
          const ww = w.w ?? w.width ?? 0, wh = w.h ?? w.height ?? 0;
          const px = Math.max(wx, Math.min(nx, wx + ww));
          const py = Math.max(wy, Math.min(ny, wy + wh));
          const dx = nx - px, dy = ny - py;
          const distSq = dx * dx + dy * dy;
          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            if (dist < 0.001) {
              // Deep inside? Find which side is closer and snap
              const dl = nx - wx, dr = (wx + ww) - nx, dt = ny - wy, db = (wy + wh) - ny;
              const min = Math.min(dl, dr, dt, db);
              if (min === dl) nx = wx - (radius + margin);
              else if (min === dr) nx = wx + ww + (radius + margin);
              else if (min === dt) ny = wy - (radius + margin);
              else ny = wy + wh + (radius + margin);
            } else {
              const unitX = dx / dist, unitY = dy / dist;
              nx = px + unitX * (radius + margin);
              ny = py + unitY * (radius + margin);
            }
          }
        }
      }
    };

    resolveList(mapData.walls);
    resolveList(mapData.lowObstacles);

    return { x: nx, y: ny };
  }

  /** Far search: used for initial spawns */
  static findSafeSpawn(x: number, y: number, radius: number, mapData: MapData, worldSize: number = 2048): { x: number, y: number } {
    if (!mapData) return { x, y };
    if (!this.isColliding(x, y, radius, mapData, worldSize, 5)) return { x, y };

    const step = 20;
    const maxRings = 20;
    for (let r = 1; r <= maxRings; r++) {
      const angleStep = Math.PI / (4 * r);
      for (let a = 0; a < Math.PI * 2; a += angleStep) {
        const tx = Math.round(x + Math.cos(a) * r * step);
        const ty = Math.round(y + Math.sin(a) * r * step);
        if (!this.isColliding(tx, ty, radius, mapData, worldSize, 8)) { 
           return { x: tx, y: ty };
        }
      }
    }
    return { x, y };
  }
}
