<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "#layers/ui/app/lib/utils"
import { Button } from "#layers/ui/app/components/shadcn/ui/button"
import { useSidebar } from "./utils"

const props = defineProps<{
	class?: HTMLAttributes["class"]
	label: string
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
	<Button
		data-sidebar="trigger"
		data-slot="sidebar-trigger"
		variant="ghost"
		size="icon"
		:class="
			cn(
				'h-7 w-7 cursor-pointer hover:bg-sidebar-accent/50 active:bg-sidebar-accent',
				props.class,
			)
		"
		@click="toggleSidebar"
	>
		<Icon name="lucide:panel-left" />
		<span class="sr-only">{{ props.label }}</span>
	</Button>
</template>
