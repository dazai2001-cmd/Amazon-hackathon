/** Shared ownership guard for startup, failure, frame callbacks and wake locks. */
export class CameraOwner<T extends { stop(): void }> {
  current: T | null = null;
  replace(camera: T) { this.stop(); this.current = camera; }
  owns(camera: T) { return this.current === camera; }
  clear(camera: T) { if (!this.owns(camera)) return false; this.current = null; return true; }
  stop() { const previous = this.current; this.current = null; previous?.stop(); }
}
