<script lang="ts" setup>
import { cn } from "#layers/ui/app/lib/utils"
import { MetricSimulationPreset } from "../utils"
import { DiffStatus } from "~/components/editor/diff/position-map"

const selectedPreset = defineModel<MetricSimulationPreset | null>()
const props = defineProps<{
	diffStatus?: DiffStatus | null
}>()
const { isEditable } = useEditorMeta()
const editorStore = useEditorStore()

const isEditingDisabled = computed(() => {
	return !isEditable.value || editorStore.reviewableDiffActive
})

function selectPreset(preset: MetricSimulationPreset) {
	if (!isEditingDisabled.value) {
		selectedPreset.value = preset
	}
}
</script>
<template>
	<ShadcnUiDropdownMenu>
		<ShadcnUiDropdownMenuTrigger as-child :disabled="isEditingDisabled">
			<ShadcnUiButton
				variant="outline-transparent"
				size="custom"
				:class="
					cn(
						'h-[1.775rem]! justify-between gap-1 px-1.5 text-2sm font-normal opacity-100!',
						isEditingDisabled && 'pointer-events-none select-text',
						props.diffStatus === DiffStatus.Added && 'bg-diff-field-added',
						props.diffStatus === DiffStatus.Removed && 'bg-diff-field-removed',
					)
				"
			>
				<span v-if="!selectedPreset" class="text-muted-foreground select-none">
					{{ $t("editor.metrics.simulation.preset-placeholder") }}
				</span>
				<span v-else>
					{{ $t(`editor.metrics.simulation.preset-options.${selectedPreset}`) }}
				</span>
				<Icon v-show="!isEditingDisabled" name="lucide:chevron-down" />
			</ShadcnUiButton>
		</ShadcnUiDropdownMenuTrigger>
		<ShadcnUiDropdownMenuContent
			class="w-[var(--reka-dropdown-menu-trigger-width)]"
			align="start"
			loop
			inside-modal
		>
			<ShadcnUiDropdownMenuItem
				v-for="preset in Object.values(MetricSimulationPreset)"
				:key="preset"
				@click="selectPreset(preset)"
			>
				{{ $t(`editor.metrics.simulation.preset-options.${preset}`) }}
			</ShadcnUiDropdownMenuItem>
		</ShadcnUiDropdownMenuContent>
	</ShadcnUiDropdownMenu>
</template>
