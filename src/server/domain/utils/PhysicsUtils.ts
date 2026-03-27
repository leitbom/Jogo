export interface Wall {
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  shape?: 'circle' | 'rect';
}

export interface MapData {
  walls?: Wall[];
  lowObstacles?: Wall[];
}

export class PhysicsUtils {
  static isColliding(cx: number, cy: number, radius: number, mapData: MapData): boolean {
    if (!mapData) return false;

    const checkList = (list: Wall[] = []) => {
      for (const w of list) {
        if (w.shape === 'circle' || (w.r !== undefined && w.w === undefined)) {
          const distSq = (cx - (w.x || 0)) ** 2 + (cy - (w.y || 0)) ** 2;
          const minDist = radius + (w.r || 0);
          if (distSq < minDist * minDist) return true;
        } else {
          const ww = w.w || w.w || 0;
          const wh = w.h || w.h || 0;
          const nx = Math.max(w.x, Math.min(cx, w.x + ww));
          const ny = Math.max(w.y, Math.min(cy, w.y + wh));
          const distSq = (cx - nx) ** 2 + (cy - ny) ** 2;
          if (distSq < radius * radius) return true;
        }
      }
      return false;
    };

    if (checkList(mapData.walls)) return true;
    if (checkList(mapData.lowObstacles)) return true;
    return false;
  }

  static findSafeSpawn(x: number, y: number, radius: number, mapData: MapData): { x: number, y: number } {
    if (!mapData) return { x, y };

    // Initial check with slightly larger radius for safety
    if (!this.isColliding(x, y, radius + 5, mapData)) return { x, y };

    // Spiral search for a safe spot
    const step = 20;
    const maxRings = 20; // Max 400px away
    for (let r = 1; r <= maxRings; r++) {
      const angleStep = Math.PI / (4 * r);
      for (let a = 0; a < Math.PI * 2; a += angleStep) {
        const tx = Math.round(x + Math.cos(a) * r * step);
        const ty = Math.round(y + Math.sin(a) * r * step);
        if (!this.isColliding(tx, ty, radius + 8, mapData)) { // Extra margin for spawn
           return { x: tx, y: ty };
        }
      }
    }
    return { x, y }; // Fallback
  }
}
