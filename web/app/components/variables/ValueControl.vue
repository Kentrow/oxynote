<script lang="ts" setup>
import type { VariableTreeElement } from "~/utils"
import { showToastMessage } from "../toast"
import {
	NO_AUTOFILL,
	isCustomValue,
	optionLabel,
	orderedOptions,
	variableReference,
} from "./variables"

const SAVE_DEBOUNCE_MS = 500

const props = defineProps<{
	variable: VariableTreeElement
}>()

const { t } = useI18n({ useScope: "global" })
const { setVariableValue, resetVariableValue } = useVariableAPI()
const controlId = useId()

const textDraft = ref("")
const numberDraft = ref<number | undefined>(undefined)
const custom = computed(() => isCustomValue(props.variable))
const options = computed(() => orderedOptions(props.variable))
// the default sits in the control as its placeholder, so an empty control
// reads as "use the default"
const placeholder = computed(() => {
	const { defaultValue, options, type } = props.variable
	if (type === "list") {
		const option = options.find((o) => o.id === defaultValue)

		return option ? optionLabel(props.variable, option.value, t) : ""
	}

	return defaultValue ?? ""
})

watchImmediate(
	() => props.variable.value,
	(value) => {
		textDraft.value = value ?? ""
		numberDraft.value = value === null ? undefined : Number(value)
	},
)

// a typed number or text saves once the user pauses. Blur and enter save
// at once and drop the pending save.
const { start: saveDraftSoon, stop: cancelDraftSave } = useTimeoutFn(
	saveDraft,
	SAVE_DEBOUNCE_MS,
	{ immediate: false },
)

watch([textDraft, numberDraft], () => {
	saveDraftSoon()
})

async function saveValue(value: string | undefined) {
	const current = props.variable.value ?? undefined
	if (value === current) {
		return
	}

	if (value === undefined) {
		await resetValue()
		return
	}

	try {
		await setVariableValue.mutateAsync({
			id: props.variable.id,
			req: { value: value },
		})
	} catch {
		showToastMessage("error", t("variable.errors.value-failed"))
	}
}

async function resetValue() {
	try {
		await resetVariableValue.mutateAsync(props.variable.id)
	} catch {
		showToastMessage("error", t("variable.errors.value-failed"))
	}
}

function saveDraft() {
	if (props.variable.type === "number") {
		saveNumber()
	} else if (props.variable.type === "text") {
		saveText()
	}
}

function saveText() {
	cancelDraftSave()
	void saveValue(textDraft.value || undefined)
}

function saveNumber() {
	cancelDraftSave()
	void saveValue(
		numberDraft.value === undefined ? undefined : String(numberDraft.value),
	)
}

function saveSelection(value: unknown) {
	if (typeof value === "string") {
		void saveValue(value)
	}
}
</script>
<template>
	<div class="flex flex-col gap-1 py-1 pr-2 pl-7">
		<div class="flex h-4 items-center gap-2">
			<div class="flex min-w-0 flex-1 items-baseline gap-1.5">
				<ShadcnUiLabel
					:for="controlId"
					class="block min-w-0 truncate text-2sm leading-4 font-medium text-foreground"
				>
					{{ props.variable.name }}
				</ShadcnUiLabel>
				<span class="shrink-0 font-mono text-2xs text-muted-foreground">
					({{ variableReference(props.variable.key) }})
				</span>
			</div>
			<ShadcnUiButton
				v-if="custom"
				variant="ghost-plain"
				size="custom"
				class="gap-1 text-xs text-muted-foreground"
				@click="resetValue"
			>
				<Icon name="mingcute:refresh-anticlockwise-1-line" class="size-3" />
				{{ $t("variable.actions.reset") }}
			</ShadcnUiButton>
		</div>
		<ShadcnUiSelect
			v-if="props.variable.type === 'list'"
			:model-value="props.variable.value ?? undefined"
			@update:model-value="saveSelection"
		>
			<ShadcnUiSelectTrigger
				:id="controlId"
				size="custom"
				class="w-full text-2sm"
			>
				<ShadcnUiSelectValue :placeholder="placeholder" />
			</ShadcnUiSelectTrigger>
			<ShadcnUiSelectContent
				class="max-h-[40dvh]"
				side="bottom"
				align="start"
				inside-sheet
			>
				<ShadcnUiSelectItem
					v-for="option in options"
					:key="option.id"
					:value="option.id"
					class="text-2sm"
				>
					{{ optionLabel(props.variable, option.value, t) }}
				</ShadcnUiSelectItem>
			</ShadcnUiSelectContent>
		</ShadcnUiSelect>
		<VariablesTimeRangeSelect
			v-else-if="props.variable.type === 'time-range'"
			:id="controlId"
			:model-value="props.variable.value ?? undefined"
			:placeholder="props.variable.defaultValue"
			@update:model-value="saveValue"
		/>
		<NumberInput
			v-else-if="props.variable.type === 'number'"
			:id="controlId"
			v-model="numberDraft"
			disable-focus-effect
			v-bind="NO_AUTOFILL"
			decimal
			class="h-[1.775rem] px-2 text-2sm tabular-nums md:text-2sm"
			:placeholder="placeholder"
			@blur="saveNumber"
			@keydown.enter="saveNumber"
		/>
		<ShadcnUiTextarea
			v-else
			:id="controlId"
			v-model="textDraft"
			class="min-h-14 px-2 text-2sm focus-visible:border-input focus-visible:ring-0 md:text-2sm"
			:placeholder="placeholder"
			@blur="saveText"
		/>
	</div>
</template>
