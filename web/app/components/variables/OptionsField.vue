<script lang="ts" setup>
import { nanoid } from "nanoid"
import {
	VARIABLE_DRAG_GROUPS,
	draggableItem,
	moveBefore,
	NO_AUTOFILL,
	type OptionDraft,
} from "./variables"

const props = defineProps<{
	labelId: string
}>()
const options = defineModel<OptionDraft[]>({ required: true })

const { t } = useI18n({ useScope: "global" })

const newOption = ref("")

// an option dropped onto the add option row goes to the end
const ADD_OPTION_ROW = draggableItem({
	id: "variable-options-end",
	parentId: null,
	dragGroup: VARIABLE_DRAG_GROUPS.option,
	draggable: false,
	acceptsChildren: true,
})

function optionItem(option: OptionDraft) {
	return draggableItem({
		id: option.id,
		parentId: null,
		dragGroup: VARIABLE_DRAG_GROUPS.option,
		draggable: true,
		acceptsChildren: false,
	})
}

function addOption() {
	const value = newOption.value.trim()
	if (!value || options.value.some((o) => o.value === value)) {
		return
	}

	options.value = [
		...options.value,
		{ id: nanoid(), existing: false, value: value },
	]
	newOption.value = ""
}

function removeOption(id: string) {
	options.value = options.value.filter((o) => o.id !== id)
}

function moveOption(id: string, insertBeforeId: string | null) {
	options.value = moveBefore(options.value, id, insertBeforeId)
}
</script>
<template>
	<div role="group" :aria-labelledby="props.labelId" class="flex flex-col">
		<!--the rows space themselves with padding instead of a gap, so a drop
			marker on a row's top edge sits midway between two options-->
		<VariablesDraggableRow
			v-for="(option, index) in options"
			:key="option.id"
			:item="optionItem(option)"
			:previous-id="options[index - 1]?.id ?? null"
			class="py-0.75"
			@move="(data) => moveOption(option.id, data.insertBeforeId)"
		>
			<div
				class="flex h-[1.775rem] cursor-grab items-center gap-2 rounded-md border border-border bg-background pr-1 pl-2 text-2sm"
			>
				<Icon
					name="mingcute:dots-line"
					class="size-3.5 shrink-0 text-muted-foreground/50"
				/>
				<span class="min-w-0 flex-1 truncate">{{ option.value }}</span>
				<span class="flex shrink-0 items-center gap-1">
					<span
						v-if="index === 0"
						class="rounded-full bg-muted px-1.75 py-0.5 text-2sm font-semibold text-muted-foreground"
					>
						{{ t("variable.variable-form.option-default") }}
					</span>
					<ShadcnUiButton
						type="button"
						variant="ghost"
						size="icon-xsm"
						class="text-muted-foreground"
						@click="removeOption(option.id)"
					>
						<Icon name="mingcute:close-line" class="size-3" />
						<span class="sr-only">
							{{
								t("variable.variable-form.remove-option", {
									value: option.value,
								})
							}}
						</span>
					</ShadcnUiButton>
				</span>
			</div>
		</VariablesDraggableRow>
		<VariablesDraggableRow
			:item="ADD_OPTION_ROW"
			:previous-id="options.at(-1)?.id ?? null"
			class="py-0.75"
		>
			<ShadcnUiInputGroup
				disable-focus-effect
				class="h-[1.775rem] border-transparent"
			>
				<ShadcnUiInputGroupAddon class="border-r-0! pl-2">
					<Icon name="mingcute:add-line" class="size-3.5" />
				</ShadcnUiInputGroupAddon>
				<ShadcnUiInputGroupInput
					v-model="newOption"
					v-bind="NO_AUTOFILL"
					class="px-2 text-2sm md:text-2sm"
					:placeholder="t('variable.variable-form.add-option')"
					@keydown.enter.prevent="addOption"
					@blur="addOption"
				/>
			</ShadcnUiInputGroup>
		</VariablesDraggableRow>
	</div>
</template>
