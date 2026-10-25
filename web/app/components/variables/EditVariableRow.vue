<script lang="ts" setup>
import type { VariableTreeElement } from "~/utils"
import { variableReference } from "./variables"

const props = defineProps<{
	variable: VariableTreeElement
}>()
const emit = defineEmits<{
	(e: "open"): void
}>()

const { t } = useI18n({ useScope: "global" })

function typeIcon(variable: VariableTreeElement) {
	switch (variable.type) {
		case "list":
			return "mingcute:list-check-line"
		case "number":
			return "mingcute:hashtag-line"
		case "text":
			return "mingcute:text-line"
		default:
			return "mingcute:time-line"
	}
}
</script>
<template>
	<div
		class="flex h-8 items-center gap-2 rounded-md pr-1 pl-7 text-2sm transition-colors duration-150 group-hover/variable-row:bg-accent/50"
	>
		<Icon
			v-if="props.variable.builtin"
			name="mingcute:lock-line"
			class="size-3.5 shrink-0 text-muted-foreground"
		/>
		<Icon
			v-else
			name="mingcute:dots-line"
			class="size-3.5 shrink-0 cursor-grab text-muted-foreground/50"
		/>
		<Icon
			:name="typeIcon(props.variable)"
			class="size-3.5 shrink-0 text-muted-foreground"
		/>
		<span class="min-w-0 flex-1 truncate">{{ props.variable.name }}</span>
		<span class="shrink-0 font-mono text-2xs text-muted-foreground">
			{{ variableReference(props.variable.key) }}
		</span>
		<ShadcnUiButton
			variant="ghost"
			size="icon-xsm"
			class="text-muted-foreground"
			@click="emit('open')"
		>
			<Icon name="mingcute:right-line" class="size-3.5" />
			<span class="sr-only">
				{{
					t("variable.actions.open-variable", {
						name: props.variable.name,
					})
				}}
			</span>
		</ShadcnUiButton>
	</div>
</template>
