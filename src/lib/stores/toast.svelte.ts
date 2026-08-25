export type ToastTone = 'info' | 'success' | 'warning' | 'error';

interface Toast {
	id: number;
	tone: ToastTone;
	/** Already-localised text. Toasts never carry passenger data. */
	message: string;
}

const DEFAULT_TTL_MS = 6000;

class ToastStore {
	items = $state<Toast[]>([]);
	#nextId = 1;
	#timers = new Map<number, ReturnType<typeof setTimeout>>();

	show(message: string, tone: ToastTone = 'info', ttl: number = DEFAULT_TTL_MS): number {
		const id = this.#nextId++;
		this.items = [...this.items, { id, tone, message }];
		if (ttl > 0) {
			this.#timers.set(
				id,
				setTimeout(() => this.dismiss(id), ttl)
			);
		}
		return id;
	}

	dismiss(id: number): void {
		const timer = this.#timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.#timers.delete(id);
		}
		this.items = this.items.filter((toast) => toast.id !== id);
	}

	clear(): void {
		for (const timer of this.#timers.values()) clearTimeout(timer);
		this.#timers.clear();
		this.items = [];
	}
}

export const toasts = new ToastStore();
