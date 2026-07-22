export class UsageStore {
  constructor({ storage, key, now = () => new Date() }) {
    this.storage = storage;
    this.key = key;
    this.now = now;
  }

  monthId(date = this.now()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  read() {
    try {
      const value = JSON.parse(this.storage.getItem(this.key));
      if (value?.month === this.monthId()) {
        return { month: value.month, places: Math.max(0, Number(value.places) || 0) + Math.max(0, Number(value.geocoding) || 0) };
      }
    } catch (_) { /* Corrupt local data is replaced safely. */ }
    return { month: this.monthId(), places: 0 };
  }

  increment() {
    const usage = this.read();
    usage.places += 1;
    this.storage.setItem(this.key, JSON.stringify(usage));
    return usage;
  }

  nextReset() {
    const current = this.now();
    return new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
}
