<script lang="ts" setup>
import type { HTMLAttributes } from "vue"
import { cn } from "#layers/ui/app/lib/utils"
import type { DraggableItem } from "./variables"

const props = defineProps<{
	item: DraggableItem
	previousId?: string | null
	class?: HTMLAttributes["class"]
}>()
const emit = defineEmits<{
	(
		e: "move",
		data: { parentId: string | null; insertBeforeId: string | null },
	): void
}>()

const rowElem = useTemplateRef("row")
const topEdgeElem = useTemplateRef("top-edge")
const {
	isItemDraggedOn,
	isTopEdgeDraggedOn,
	isDraggingGlobal,
	isDraggingSelf,
	draggedGhostStyle,
} = useSidebarDraggable(
	rowElem,
	() => props.item,
	topEdgeElem,
	() => rowElem.value,
	(data) => {
		emit("move", {
			parentId: data.targetParentId,
			insertBeforeId: data.targetInsertBeforeId,
		})
	},
	{
		disabled: () => !props.item.draggable,
		minDistance: 5,
		noopFor: () => props.previousId,
	},
)

// a row that only takes drops can share the dragged row's id, as a group's
// add variable row does, so it must not take the drag for its own
const dragged = computed(() => isDraggingSelf.value && props.item.draggable)
// the ghost takes the height of what it shows, which can differ from the
// row it was dragged by: a group shows its variables, and a padded row
// leaves its padding behind
const ghostStyle = computed(() => ({
	...draggedGhostStyle.value,
	height: undefined,
}))
</script>
<template>
	<div ref="row" :class="cn('relative', props.class)">
		<Teleport v-if="dragged" to="body">
			<div
				:style="ghostStyle"
				class="pointer-events-none fixed z-draggable rounded-md bg-accent opacity-70"
				data-ghost
			>
				<slot name="ghost">
					<slot />
				</slot>
			</div>
		</Teleport>
		<div
			v-if="props.item.draggable"
			ref="top-edge"
			class="absolute -top-1.5 z-5 flex h-3 w-full items-center"
		>
			<div
				v-show="isDraggingGlobal && isTopEdgeDraggedOn"
				class="h-1 w-full bg-drag-target"
			/>
		</div>
		<!--a drop onto a row that takes children appends to the end of the
			list that row closes, so the marker sits where the item lands-->
		<div
			v-show="isItemDraggedOn"
			class="absolute -top-0.5 z-5 h-1 w-full bg-drag-target"
		/>
		<slot />
	</div>
</template>
