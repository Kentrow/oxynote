import {
	SIDEBAR_COOKIE_MAX_AGE,
	SIDEBAR_COOKIE_NAME,
} from "#layers/ui/app/components/shadcn/ui/sidebar/constants"

// the sidebar's open state, kept across reloads and on the desktop build.
// It is bound to the sidebar provider with v-model:open.
export default function () {
	return usePersistentState<boolean>({
		key: SIDEBAR_COOKIE_NAME,
		defaultValue: true,
		cookie: {
			maxAge: SIDEBAR_COOKIE_MAX_AGE,
		},
	})
}
