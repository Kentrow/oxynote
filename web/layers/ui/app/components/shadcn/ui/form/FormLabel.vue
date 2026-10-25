<script lang="ts" setup>
import type { LabelProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { cn } from "#layers/ui/app/lib/utils"
import { Label } from "#layers/ui/app/components/shadcn/ui/label"
import { useFormField } from "./useFormField"

const props = defineProps<
	LabelProps & {
		class?: HTMLAttributes["class"]
		disableDestructiveEffect?: boolean
	}
>()

const { error, formItemId } = useFormField()
</script>

<template>
	<Label
		data-slot="form-label"
		:data-error="!!error"
		:class="
			cn(
				!props.disableDestructiveEffect && 'data-[error=true]:text-destructive',
				props.class,
			)
		"
		:for="formItemId"
	>
		<slot />
	</Label>
</template>
