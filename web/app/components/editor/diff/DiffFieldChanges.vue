<script lang="ts" setup>
import { cn } from "#layers/ui/app/lib/utils"
import type { FieldChange } from "./change-count"

const props = defineProps<{
	rows: FieldChange[]
}>()
</script>

<template>
	<dl
		class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5 text-xs"
	>
		<template v-for="(row, index) in props.rows" :key="index">
			<dt class="whitespace-nowrap text-muted-foreground">{{ row.label }}</dt>
			<dd
				:class="
					cn(
						'flex min-w-0 flex-wrap items-baseline gap-1',
						row.code && 'font-mono',
					)
				"
			>
				<span
					v-if="row.oldValue !== null"
					class="rounded-sm bg-diff-text-removed px-1 break-all line-through"
				>
					{{ row.oldValue || $t("editor.diff-change-marker.empty") }}
				</span>
				<Icon
					v-if="row.oldValue !== null && row.newValue !== null"
					name="mingcute:arrow-right-line"
					class="size-3 shrink-0 self-center text-muted-foreground"
				/>
				<span
					v-if="row.newValue !== null"
					class="rounded-sm bg-diff-text-added px-1 break-all"
				>
					{{ row.newValue || $t("editor.diff-change-marker.empty") }}
				</span>
			</dd>
		</template>
	</dl>
</template>
