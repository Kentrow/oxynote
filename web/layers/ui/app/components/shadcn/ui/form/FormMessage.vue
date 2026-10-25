<script lang="ts" setup>
import type { HTMLAttributes } from "vue"
import { ErrorMessage } from "vee-validate"
import { toValue } from "vue"
import { cn } from "#layers/ui/app/lib/utils"
import { useFormField } from "./useFormField"

const props = defineProps<{
	class?: HTMLAttributes["class"]
}>()

const { name, formMessageId } = useFormField()
</script>

<template>
	<ErrorMessage
		:id="formMessageId"
		data-slot="form-message"
		as="p"
		:name="toValue(name)"
		:class="cn('text-sm text-destructive', props.class)"
	/>
</template>
