<script lang="ts" setup generic="T">
import { cn } from "#layers/ui/app/lib/utils"

// an undefined side had nothing set, so it shows emptyLabel instead. Both
// sides take the same width, and the taller one sets the height of both.
const props = defineProps<{
	before?: T
	after?: T
	emptyLabel: string
}>()

defineSlots<{
	default: (props: { value: T }) => unknown
}>()

const sides = computed(() => [
	{ key: "before", value: props.before, borderClass: "border-diff-removed" },
	{ key: "after", value: props.after, borderClass: "border-diff-added" },
])
</script>

<template>
	<div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2">
		<template v-for="(side, index) in sides" :key="side.key">
			<Icon
				v-if="index > 0"
				name="mingcute:arrow-right-line"
				class="size-3.5 self-center text-muted-foreground"
			/>
			<div
				:class="
					cn(
						'flex min-h-14 items-center justify-center overflow-hidden rounded-md border-2',
						side.borderClass,
					)
				"
			>
				<slot v-if="side.value !== undefined" :value="side.value" />
				<span
					v-else
					class="px-2 text-center text-xs text-muted-foreground italic"
				>
					{{ props.emptyLabel }}
				</span>
			</div>
		</template>
	</div>
</template>
