<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "#layers/ui/app/lib/utils"
import { Separator } from "#layers/ui/app/components/shadcn/ui/separator"

const props = defineProps<{
	class?: HTMLAttributes["class"]
}>()
</script>

<template>
	<Separator
		data-slot="sidebar-separator"
		data-sidebar="separator"
		:class="cn('mx-2 w-auto bg-sidebar-border', props.class)"
	>
		<slot />
	</Separator>
</template>
