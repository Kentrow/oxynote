<script lang="ts" setup>
import { cn } from "#layers/ui/app/lib/utils"
import type {
	MetricConfig,
	MetricRefreshInterval,
	MetricTimeRange,
} from "../utils"
import { RefreshInterval, TimeRangePreset } from "~/utils/time-range"
import {
	METRIC_REFRESH_INTERVAL_REFERENCE,
	METRIC_TIME_RANGE_REFERENCE,
} from "~/utils/variable"
import VisualizationContainer from "../VisualizationContainer.vue"
import BottomConfig from "./BottomConfig.vue"
import ConfigSidebar from "./ConfigSidebar.vue"
import { DiffStatus } from "~/components/editor/diff/position-map"

const emit = defineEmits<{
	(e: "open-settings"): void
}>()

const editorStore = useEditorStore()
const { t } = useI18n({ useScope: "global" })
const isMinWidth1024px = useMediaQuery("(min-width: 1024px)")
const { isEditable } = useEditorMeta()

// getter-only: the reactive config from MainBlock is stored directly in Pinia,
// so property mutations by child components flow through without replacement
const config = computed(() => {
	if (
		!editorStore.activeMetricBlockConfig ||
		!editorStore.activeDocumentId ||
		!editorStore.activeBranchId
	) {
		return null
	}

	return (
		editorStore.metricBlockConfigs[editorStore.activeDocumentId]?.[
			editorStore.activeBranchId
		]?.[editorStore.activeMetricBlockConfig] ?? null
	)
})
const diffStatus = computed<DiffStatus | null>(() => {
	if (
		!editorStore.activeMetricBlockConfig ||
		!editorStore.activeDocumentId ||
		!editorStore.activeBranchId
	) {
		return null
	}

	return (
		editorStore.metricBlockDiffStatuses[editorStore.activeDocumentId]?.[
			editorStore.activeBranchId
		]?.[editorStore.activeMetricBlockConfig] ?? null
	)
})
const oldConfig = computed<MetricConfig | null>(() => {
	if (
		!editorStore.activeMetricBlockConfig ||
		!editorStore.activeDocumentId ||
		!editorStore.activeBranchId
	) {
		return null
	}

	return (
		editorStore.metricBlockOldConfigs[editorStore.activeDocumentId]?.[
			editorStore.activeBranchId
		]?.[editorStore.activeMetricBlockConfig] ?? null
	)
})

const isEditingDisabled = computed(() => {
	return !isEditable.value || editorStore.reviewableDiffActive
})
const isDiffModified = computed(() => diffStatus.value === DiffStatus.Modified)
const isTimeRangeModified = computed(() => {
	return (
		isDiffModified.value &&
		!!oldConfig.value &&
		oldConfig.value.timeRange !== config.value?.timeRange
	)
})
const isRefreshIntervalModified = computed(() => {
	return (
		isDiffModified.value &&
		!!oldConfig.value &&
		oldConfig.value.refreshInterval !== config.value?.refreshInterval
	)
})
const chartTopOptionElem = useTemplateRef<HTMLDivElement>("chart-top-options")
const { width: chartTopOptionWidth } = useElementSize(chartTopOptionElem)
const simulationVisible = ref(false)

// a chart that uses a built-in variable has no value of its own to name,
// so the label says the shared setting decides
function timeRangeLabel(value: MetricTimeRange | null) {
	if (value === METRIC_TIME_RANGE_REFERENCE) {
		return t("editor.metrics.config.variable-time-range")
	}

	return value ? t(`general.time-range-options.${value}`) : ""
}

function refreshIntervalLabel(value: MetricRefreshInterval | null) {
	if (value === METRIC_REFRESH_INTERVAL_REFERENCE) {
		return t("editor.metrics.config.variable-refresh-interval")
	}

	return value ? t(`general.refresh-interval-options-short.${value}`) : ""
}

function updateOpenStatus(v: boolean) {
	if (v) {
		return
	}

	editorStore.activateMetricBlockConfig(null)
}

function openSettings() {
	editorStore.activateMetricBlockConfig(null)
	emit("open-settings")
}
</script>
<template>
	<ShadcnUiDialog
		:open="!!editorStore.activeMetricBlockConfig"
		@update:open="updateOpenStatus"
	>
		<ShadcnUiDialogContent
			class="max-h-[90dvh] w-[90dvw] overflow-y-auto p-0 text-foreground outline-none md:max-h-[85dvh] lg:w-240"
			@open-auto-focus.prevent
			@interact-outside="
				(event) => {
					const target = event.target as HTMLElement
					if (
						target?.closest('[data-sonner-toaster]') ||
						target?.closest('.cm-tooltip-autocomplete')
					) {
						return event.preventDefault()
					}
				}
			"
		>
			<div class="flex flex-col gap-5 p-6">
				<ShadcnUiDialogHeader>
					<ShadcnUiDialogTitle class="text-2xl">
						{{
							diffStatus
								? $t(`editor.metrics.config.modal-title-diff-${diffStatus}`)
								: !isEditingDisabled
									? $t("editor.metrics.config.modal-title-normal")
									: $t("editor.metrics.config.modal-title-readonly")
						}}
					</ShadcnUiDialogTitle>
					<ShadcnUiDialogDescription class="sr-only">
						{{
							!isEditingDisabled
								? $t("editor.metrics.config.modal-description-normal")
								: $t("editor.metrics.config.modal-description-readonly")
						}}
					</ShadcnUiDialogDescription>
					<ShadcnUiButton
						variant="ghost-plain"
						class="absolute top-1/2 right-0 -translate-y-1/2 p-0"
						@click="updateOpenStatus(false)"
					>
						<Icon name="lucide:x" size="1.3rem" />
						<span class="sr-only">
							{{ $t("general.modal-close-screen-reader-hint") }}
						</span>
					</ShadcnUiButton>
				</ShadcnUiDialogHeader>
				<div
					v-if="config"
					class="flex flex-col rounded-md border bg-muted/50 lg:h-126 lg:flex-row"
				>
					<div class="flex min-w-0 flex-1 flex-col self-stretch">
						<div class="relative h-70 min-w-0 shrink-0 border-b">
							<div
								ref="chart-top-options"
								:class="
									cn(
										'absolute top-1.5 right-1.5 z-1 flex flex-col items-end gap-0.5 pr-1 pl-2 md:flex-row md:items-center md:gap-2 md:bg-muted-50-real',
									)
								"
							>
								<ShadcnUiTooltip v-if="simulationVisible">
									<ShadcnUiTooltipTrigger as-child>
										<Icon
											name="mingcute:test-tube-line"
											class="size-3.5 text-foreground"
										/>
									</ShadcnUiTooltipTrigger>
									<ShadcnUiTooltipContent side="bottom">
										{{ $t("editor.metrics.simulation.tooltip") }}
									</ShadcnUiTooltipContent>
								</ShadcnUiTooltip>
								<div class="flex flex-col items-end gap-0.5 md:gap-1">
									<ShadcnUiSelect v-model="config.timeRange">
										<ShadcnUiSelectTrigger
											disable-default-styles
											:disable="isEditingDisabled"
											as-child
										>
											<ShadcnUiButton
												variant="ghost-plain"
												size="custom"
												:class="
													cn(
														'gap-1 bg-muted-50-real text-2sm text-foreground md:bg-none',
														isEditingDisabled &&
															'pointer-events-none select-text',
														isTimeRangeModified && 'bg-diff-field-added px-0.5',
													)
												"
											>
												<Icon name="lucide:clock-9" class="size-3.5" />
												{{ timeRangeLabel(config.timeRange) }}
											</ShadcnUiButton>
										</ShadcnUiSelectTrigger>
										<ShadcnUiSelectContent class="max-h-[40dvh]" inside-modal>
											<ShadcnUiSelectItem :value="METRIC_TIME_RANGE_REFERENCE">
												<span class="text-2sm text-popover-foreground">
													{{ $t("editor.metrics.config.variable-time-range") }}
												</span>
											</ShadcnUiSelectItem>
											<ShadcnUiSelectSeparator />
											<ShadcnUiSelectItem
												v-for="timeRange in Object.values(TimeRangePreset)"
												:key="timeRange"
												:value="timeRange"
											>
												<span class="text-2sm text-popover-foreground">
													{{ $t(`general.time-range-options.${timeRange}`) }}
												</span>
											</ShadcnUiSelectItem>
										</ShadcnUiSelectContent>
									</ShadcnUiSelect>
									<ShadcnUiButton
										v-if="isTimeRangeModified && oldConfig"
										variant="ghost-plain"
										size="custom"
										:class="
											cn(
												'gap-1 bg-muted-50-real text-2sm text-foreground md:bg-none',
												isEditingDisabled && 'pointer-events-none select-text',
												isTimeRangeModified &&
													'bg-diff-field-removed px-0.5 md:bg-diff-field-removed',
											)
										"
									>
										<Icon name="lucide:clock-9" class="size-3.5" />
										{{ timeRangeLabel(oldConfig.timeRange) }}
									</ShadcnUiButton>
								</div>
								<div class="flex flex-col items-end gap-0.5 md:gap-1">
									<ShadcnUiSelect v-model="config.refreshInterval">
										<ShadcnUiSelectTrigger
											disable-default-styles
											:disable="isEditingDisabled"
											as-child
										>
											<ShadcnUiButton
												variant="ghost-plain"
												size="custom"
												:class="
													cn(
														'gap-1 bg-muted-50-real text-2sm text-foreground md:bg-none',
														isEditingDisabled &&
															'pointer-events-none select-text',
														isRefreshIntervalModified &&
															'bg-diff-field-added px-0.5',
													)
												"
											>
												<Icon name="lucide:refresh-ccw" class="size-3.5" />
												{{ refreshIntervalLabel(config.refreshInterval) }}
											</ShadcnUiButton>
										</ShadcnUiSelectTrigger>
										<ShadcnUiSelectContent class="max-h-[40dvh]" inside-modal>
											<ShadcnUiSelectItem
												:value="METRIC_REFRESH_INTERVAL_REFERENCE"
											>
												<span class="text-2sm text-popover-foreground">
													{{
														$t(
															"editor.metrics.config.variable-refresh-interval",
														)
													}}
												</span>
											</ShadcnUiSelectItem>
											<ShadcnUiSelectSeparator />
											<ShadcnUiSelectItem
												v-for="refreshInterval in Object.values(
													RefreshInterval,
												)"
												:key="refreshInterval"
												:value="refreshInterval"
											>
												<span class="text-2sm text-popover-foreground">
													{{
														$t(
															`general.refresh-interval-options.${refreshInterval}`,
														)
													}}
												</span>
											</ShadcnUiSelectItem>
										</ShadcnUiSelectContent>
									</ShadcnUiSelect>
									<ShadcnUiButton
										v-if="isRefreshIntervalModified && oldConfig"
										variant="ghost-plain"
										size="custom"
										:class="
											cn(
												'gap-1 bg-muted-50-real text-2sm text-foreground md:bg-none',
												isEditingDisabled && 'pointer-events-none select-text',
												isRefreshIntervalModified &&
													'bg-diff-field-removed px-0.5 md:bg-diff-field-removed',
											)
										"
									>
										<Icon name="lucide:refresh-ccw" class="size-3.5" />
										{{ refreshIntervalLabel(oldConfig.refreshInterval) }}
									</ShadcnUiButton>
								</div>
							</div>
							<VisualizationContainer
								:config="config"
								:title-right-padding="chartTopOptionWidth"
								hide-empty-action-button
								simplified-empty
								:uid="editorStore.activeMetricBlockConfig!"
								@simulate="(preset) => (config!.simulationPreset = preset)"
								@simulation-visible="(v) => (simulationVisible = v)"
							/>
						</div>
						<div v-if="!isMinWidth1024px" class="self-stretch border-b">
							<ConfigSidebar
								:model-value="config"
								:diff-status="diffStatus"
								:old-config="oldConfig"
								@open-settings="openSettings"
							/>
						</div>
						<div class="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
							<BottomConfig
								:model-value="config"
								:diff-status="diffStatus"
								:old-config="oldConfig"
							/>
						</div>
					</div>
					<div
						v-if="isMinWidth1024px"
						class="w-70 self-stretch border-l lg:overflow-y-auto"
					>
						<ConfigSidebar
							:model-value="config"
							:diff-status="diffStatus"
							:old-config="oldConfig"
							@open-settings="openSettings"
						/>
					</div>
				</div>
			</div>
		</ShadcnUiDialogContent>
	</ShadcnUiDialog>
</template>
