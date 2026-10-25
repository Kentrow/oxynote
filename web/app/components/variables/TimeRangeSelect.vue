<script lang="ts" setup>
import { TimeRangePreset } from "~/utils/time-range"

// the select itself renders no element, so the id and aria attributes a
// label or form control hands down go to the trigger
defineOptions({ inheritAttrs: false })

const props = defineProps<{
	placeholder?: string | null
}>()
const model = defineModel<string | undefined>()

const { t } = useI18n({ useScope: "global" })

const presets = Object.values(TimeRangePreset)
const placeholderLabel = computed(() => {
	const preset = presets.find((p) => p === props.placeholder)

	return preset ? t(`general.time-range-options.${preset}`) : ""
})
</script>
<template>
	<ShadcnUiSelect v-model="model">
		<ShadcnUiSelectTrigger
			v-bind="$attrs"
			size="custom"
			class="w-full text-2sm"
		>
			<span class="flex min-w-0 items-center gap-2">
				<Icon
					name="mingcute:time-line"
					class="size-3.5 text-muted-foreground"
				/>
				<ShadcnUiSelectValue :placeholder="placeholderLabel" />
			</span>
		</ShadcnUiSelectTrigger>
		<ShadcnUiSelectContent
			class="max-h-[40dvh]"
			side="bottom"
			align="start"
			inside-sheet
		>
			<ShadcnUiSelectItem
				v-for="preset in presets"
				:key="preset"
				:value="preset"
				class="text-2sm"
			>
				{{ t(`general.time-range-options.${preset}`) }}
			</ShadcnUiSelectItem>
		</ShadcnUiSelectContent>
	</ShadcnUiSelect>
</template>
