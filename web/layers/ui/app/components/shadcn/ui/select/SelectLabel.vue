<script setup lang="ts">
import type { SelectLabelProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { SelectLabel } from "reka-ui"
import { cn } from "#layers/ui/app/lib/utils"

const props = defineProps<
	SelectLabelProps & { class?: HTMLAttributes["class"] }
>()
</script>

<template>
	<SelectLabel
		data-slot="select-label"
		:class="cn('text-sm font-medium', props.class)"
	>
		<slot />
	</SelectLabel>
</template>
