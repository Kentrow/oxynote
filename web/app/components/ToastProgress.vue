<script lang="ts" setup>
import { cn } from "#layers/ui/app/lib/utils"

const props = defineProps<{
	status: "progress" | "success" | "error"
	title: string
	// a fraction from 0 to 1, or null while the total is unknown
	progress: number | null
}>()
const emit = defineEmits<{
	(event: "close"): void
}>()

const statusStyles = {
	progress: {
		icon: "mingcute:time-fill",
		iconClass: "text-muted-foreground",
		barClass: "bg-primary",
	},
	success: {
		icon: "mingcute:check-circle-fill",
		iconClass: "text-status-success",
		barClass: "bg-status-success",
	},
	error: {
		icon: "mingcute:close-circle-fill",
		iconClass: "text-status-error",
		barClass: "bg-status-error",
	},
}

// a settled toast keeps its bar, filled, because vue-sonner measures a
// toast's height only once: removing the bar would leave the stored height
// taller than the toast, which jumps when the stack expands on hover
const fraction = computed(() => {
	if (props.status !== "progress") {
		return 1
	}

	return props.progress === null
		? undefined
		: Math.min(Math.max(props.progress, 0), 1)
})

// only running work is announced as progress; a filled bar on a failed
// toast is no 100%
const barAttributes = computed(() =>
	props.status === "progress"
		? {
				role: "progressbar",
				"aria-label": props.title,
				"aria-valuemin": 0,
				"aria-valuemax": 100,
				"aria-valuenow":
					fraction.value === undefined
						? undefined
						: Math.round(fraction.value * 100),
			}
		: { "aria-hidden": true },
)

function closeToast() {
	emit("close")
}
</script>
<template>
	<div
		class="flex min-w-95 gap-1.75 rounded-lg border border-border bg-popover px-3 py-2.5 shadow-md"
	>
		<Icon
			:name="statusStyles[props.status].icon"
			:class="cn('mt-px', statusStyles[props.status].iconClass)"
			size="1rem"
		/>
		<div class="flex min-w-0 flex-1 flex-col gap-1.5">
			<div class="truncate text-2sm font-medium text-popover-foreground">
				{{ props.title }}
			</div>
			<div
				v-bind="barAttributes"
				class="mb-0.5 h-1 overflow-hidden rounded-full bg-muted"
			>
				<!-- a full-width bar slid in from the left: transforms skip
				layout, and a linear transition longer than the gap between
				updates keeps it gliding instead of stepping -->
				<div
					:class="
						cn(
							'h-full w-full rounded-full',
							statusStyles[props.status].barClass,
							fraction === undefined
								? 'animate-pulse'
								: 'transition-transform duration-300 ease-linear',
						)
					"
					:style="
						fraction === undefined
							? undefined
							: {
									transform: `translateX(${((fraction - 1) * 100).toFixed(2)}%)`,
								}
					"
				/>
			</div>
		</div>
		<ShadcnUiButton
			variant="ghost-plain"
			class="mt-px size-4 p-0"
			@click="closeToast"
		>
			<Icon name="lucide:x" size="1rem" />
			<span class="sr-only">
				{{ $t("general.modal-close-screen-reader-hint") }}
			</span>
		</ShadcnUiButton>
	</div>
</template>
