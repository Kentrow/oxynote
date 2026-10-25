import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"

// the app's main stylesheet imports assets/css/ui.css right after
// tailwindcss. Tailwind compiles each stylesheet on its own, so the app's
// utilities only see these tokens when both share one file.
export default defineNuxtConfig({
	// names the #layers/ui alias when this layer is extended from outside
	// a layers/ directory
	$meta: {
		name: "ui",
	},

	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			include: [
				"class-variance-authority",
				"clsx",
				"reka-ui",
				"tailwind-merge",
			],
		},
	},

	modules: ["@nuxt/fonts", "@nuxt/icon", "@vueuse/nuxt", "shadcn-nuxt"],

	fonts: {
		defaults: {
			weights: [400, 500, 600, 700],
		},
	},

	shadcn: {
		prefix: "ShadcnUi",
		// shadcn-nuxt resolves a relative path against the app's root, not
		// this layer's.
		componentDir: fileURLToPath(
			new URL("./app/components/shadcn/ui", import.meta.url),
		),
	},
})
