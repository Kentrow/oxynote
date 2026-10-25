<script lang="ts" setup>
import type { DeletionTarget } from "./variables"

const open = defineModel<DeletionTarget | null>({ default: null })

const lastValidTarget = useLastValidRef(open)
const loading = ref(false)

const reference = computed(() =>
	lastValidTarget.value?.kind === "variable"
		? lastValidTarget.value.reference
		: undefined,
)
const blocked = computed(
	() =>
		lastValidTarget.value?.kind === "group" &&
		lastValidTarget.value.variableCount > 0,
)

async function confirm() {
	if (!lastValidTarget.value || !open.value) {
		return
	}

	loading.value = true
	await delay(300) // show loading spinner for at least a moment
	await lastValidTarget.value.confirm()
	open.value = null

	setTimeout(() => {
		// just to ensure that the spinner is visible until the modal closes
		loading.value = false
	}, 500)
}
</script>
<template>
	<ShadcnUiDialog
		:open="!!open"
		@update:open="
			(v) => {
				if (!v) {
					open = null
				}
			}
		"
	>
		<ShadcnUiDialogContent
			class="max-h-[90dvh] w-[85dvw] overflow-y-auto p-0 text-foreground sm:w-110 md:max-h-[80dvh]"
		>
			<div class="flex min-h-0 flex-col gap-3 p-6">
				<ShadcnUiDialogHeader>
					<ShadcnUiDialogTitle class="text-base">
						{{
							lastValidTarget?.kind === "group"
								? $t("variable.deletion-modal.group-title")
								: $t("variable.deletion-modal.variable-title")
						}}
					</ShadcnUiDialogTitle>
				</ShadcnUiDialogHeader>
				<ShadcnUiDialogDescription as-child class="text-2sm">
					<i18n-t
						v-if="lastValidTarget?.kind === 'group' && blocked"
						scope="global"
						keypath="variable.deletion-modal.group-blocked"
						:plural="lastValidTarget.variableCount"
						tag="p"
					>
						<template #name>
							<span class="font-medium break-all">
								{{ lastValidTarget.name }}
							</span>
						</template>
						<template #count>{{ lastValidTarget.variableCount }}</template>
					</i18n-t>
					<i18n-t
						v-else-if="lastValidTarget?.kind === 'group'"
						scope="global"
						keypath="variable.deletion-modal.group-empty"
						tag="p"
					>
						<template #name>
							<span class="font-medium break-all">
								{{ lastValidTarget.name }}
							</span>
						</template>
					</i18n-t>
					<i18n-t
						v-else
						scope="global"
						keypath="variable.deletion-modal.variable-description"
						tag="p"
					>
						<template #name>
							<span class="font-medium break-all">
								{{ lastValidTarget?.name }}
							</span>
						</template>
						<template #reference>
							<span class="font-mono break-all">
								{{ reference }}
							</span>
						</template>
					</i18n-t>
				</ShadcnUiDialogDescription>
				<div class="flex gap-2 self-stretch">
					<ShadcnUiButton
						v-if="!blocked"
						type="button"
						variant="destructive"
						size="sm"
						:disabled="loading"
						class="text-2sm"
						@click="confirm"
					>
						<Icon
							v-show="loading"
							name="svg-spinners:blocks-shuffle-3"
							class="size-3"
						/>
						{{
							lastValidTarget?.kind === "group"
								? $t("variable.deletion-modal.group-confirm-button")
								: $t("variable.deletion-modal.variable-confirm-button")
						}}
					</ShadcnUiButton>
					<ShadcnUiButton
						type="button"
						size="sm"
						variant="secondary"
						:disabled="loading"
						class="text-2sm"
						@click="open = null"
					>
						{{ $t("variable.deletion-modal.cancel-button") }}
					</ShadcnUiButton>
				</div>
			</div>
		</ShadcnUiDialogContent>
	</ShadcnUiDialog>
</template>
