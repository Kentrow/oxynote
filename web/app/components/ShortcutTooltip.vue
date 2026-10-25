<script lang="ts" setup>
import { cn } from "#layers/ui/app/lib/utils"

const props = defineProps<{
	shortcut?: {
		keyboardKey: { macOS: string; other: string }
		i18nKey: string | null
	}
	side?: "top" | "right" | "bottom" | "left"
	align?: "start" | "center" | "end"
	class?: string
}>()
const { osType } = useDetectHost()

const isOpen = ref(false)
let hoverTimeout: ReturnType<typeof setTimeout> | null = null

// a part of the trigger with a tooltip of its own, such as a count, keeps
// this one closed while the pointer is over it
function handlePointerOver(event: PointerEvent) {
	const onOwnTooltip =
		event.target instanceof Element &&
		!!event.target.closest("[data-own-tooltip]")
	if (onOwnTooltip) {
		handlePointerLeave()
		return
	}

	if (!hoverTimeout && !isOpen.value) {
		hoverTimeout = setTimeout(() => {
			isOpen.value = true
		}, 800)
	}
}

function handlePointerLeave() {
	if (hoverTimeout) {
		clearTimeout(hoverTimeout)
		hoverTimeout = null
	}

	isOpen.value = false
}
</script>
<template>
	<ShadcnUiTooltip v-if="props.shortcut" :open="isOpen">
		<ShadcnUiTooltipTrigger
			as-child
			@pointerover="handlePointerOver"
			@pointerleave="handlePointerLeave"
		>
			<slot />
		</ShadcnUiTooltipTrigger>
		<ShadcnUiTooltipContent
			:side="props.side"
			:align="props.align"
			:class="cn('px-2 py-1', props.class)"
		>
			<div class="flex items-center justify-between gap-2 text-2sm">
				<p v-if="props.shortcut.i18nKey">
					{{ $t(props.shortcut.i18nKey) }}
				</p>
				<ShadcnUiKbdGroup>
					<template
						v-for="(val, index) in extractShortcutKeys(
							shortcutByOS(props.shortcut.keyboardKey, osType),
						)"
						:key="index"
					>
						<ShadcnUiKbd v-if="!val.connector">{{ val.key }}</ShadcnUiKbd>
						<span
							v-else-if="val.connector === 'sequence'"
							class="text-xs text-muted-foreground"
						>
							{{ $t("shortcuts.connector") }}
						</span>
					</template>
				</ShadcnUiKbdGroup>
			</div>
		</ShadcnUiTooltipContent>
	</ShadcnUiTooltip>
	<slot v-else />
</template>
