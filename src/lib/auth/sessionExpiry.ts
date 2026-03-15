type SessionExpiryListener = () => void;

const listeners = new Set<SessionExpiryListener>();
let sessionExpiryActive = false;

export function subscribeToSessionExpiry(listener: SessionExpiryListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerSessionExpiry() {
  if (sessionExpiryActive) return;
  sessionExpiryActive = true;
  listeners.forEach((listener) => listener());
}

export function resetSessionExpiryState() {
  sessionExpiryActive = false;
}
