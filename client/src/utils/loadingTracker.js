/**
 * Global lightweight loading event emitter for tracking in-flight API calls
 * and page transitions without third-party heavy dependencies.
 */
class LoadingTracker {
  constructor() {
    this.activeRequests = 0;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const isLoading = this.activeRequests > 0;
    this.listeners.forEach((listener) => listener(isLoading, this.activeRequests));
  }

  start() {
    this.activeRequests += 1;
    this.notify();
  }

  stop() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.notify();
  }

  forceComplete() {
    this.activeRequests = 0;
    this.notify();
  }
}

export const loadingTracker = new LoadingTracker();
