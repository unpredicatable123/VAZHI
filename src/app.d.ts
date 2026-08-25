declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

declare module '*?worker&url' {
	const url: string;
	export default url;
}

export {};
