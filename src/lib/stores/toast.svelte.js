const DEFAULT_TTL_MS = 6000;
class ToastStore {
    items = $state([]);
    #nextId = 1;
    #timers = new Map();
    show(message, tone = 'info', ttl = DEFAULT_TTL_MS) {
        const id = this.#nextId++;
        this.items = [...this.items, { id, tone, message }];
        if (ttl > 0) {
            this.#timers.set(id, setTimeout(() => this.dismiss(id), ttl));
        }
        return id;
    }
    dismiss(id) {
        const timer = this.#timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.#timers.delete(id);
        }
        this.items = this.items.filter((toast) => toast.id !== id);
    }
    clear() {
        for (const timer of this.#timers.values())
            clearTimeout(timer);
        this.#timers.clear();
        this.items = [];
    }
}
export const toasts = new ToastStore();
