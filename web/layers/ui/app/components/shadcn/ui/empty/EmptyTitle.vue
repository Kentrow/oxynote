<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "#layers/ui/app/lib/utils"

const props = defineProps<{
	class?: HTMLAttributes["class"]
}>()
</script>

<template>
	<div
		data-slot="empty-title"
		:class="cn('text-2base font-medium tracking-tight', props.class)"
	>
		<slot />
	</div>
</template>
