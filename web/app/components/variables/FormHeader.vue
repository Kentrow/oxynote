<script lang="ts" setup>
const props = defineProps<{
	title: string
	dirty: boolean
	creating: boolean
	saving?: boolean
}>()
const emit = defineEmits<{
	(e: "back" | "cancel" | "save"): void
}>()
</script>
<template>
	<header
		class="top-0 z-navbar h-10 shrink-0 border-b border-border bg-background pr-2 pl-4"
	>
		<div class="flex h-full w-full items-center justify-between gap-2">
			<h2 class="min-w-0 truncate text-sm">{{ props.title }}</h2>
			<!--while nothing changed the form only offers a way back. Once it
				changed, back is replaced by cancel and save-->
			<div v-if="!props.dirty" key="clean" class="flex shrink-0 items-center">
				<ShadcnUiButton
					size="2sm"
					variant="secondary"
					class="h-6.5 px-2.5 text-xs"
					@click="emit('back')"
				>
					<Icon name="mingcute:left-line" class="size-3.5" />
					{{ $t("variable.actions.back") }}
				</ShadcnUiButton>
			</div>
			<div v-else key="dirty" class="flex shrink-0 items-center gap-1">
				<ShadcnUiButton
					size="2sm"
					variant="secondary"
					class="h-6.5 px-2.5 text-xs"
					:disabled="props.saving"
					@click="emit('cancel')"
				>
					<Icon name="mingcute:close-line" class="size-3.5" />
					{{ $t("variable.actions.cancel") }}
				</ShadcnUiButton>
				<ShadcnUiButton
					size="2sm"
					class="h-6.5 px-2.5 text-xs"
					:disabled="props.saving"
					@click="emit('save')"
				>
					<Icon
						v-if="props.saving"
						name="svg-spinners:blocks-shuffle-3"
						class="size-3.5"
					/>
					<Icon
						v-else-if="props.creating"
						name="mingcute:add-line"
						class="size-3.5"
					/>
					<Icon v-else name="mingcute:check-line" class="size-3.5" />
					{{
						props.creating
							? $t("variable.actions.create")
							: $t("variable.actions.save")
					}}
				</ShadcnUiButton>
			</div>
		</div>
	</header>
</template>
