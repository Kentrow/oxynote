<script lang="ts" setup>
import type { Node as PMNode } from "@tiptap/pm/model"
import { cn } from "#layers/ui/app/lib/utils"
import {
	TextSegmentKind,
	textSegments,
} from "~/components/editor/diff/change-count"
import { dedentLines, diffLines } from "./diff-lines"

const MAX_LINES = 10

const props = defineProps<{
	node: PMNode
}>()

const changedLines = computed(() =>
	diffLines(textSegments(props.node))
		.map((line, index) => ({ ...line, index: index }))
		.filter((line) => line.changed),
)
const shownLines = computed(() =>
	dedentLines(changedLines.value.slice(0, MAX_LINES)).map(
		(line, position, shown) => ({
			...line,
			// a gap sits between two changed lines that are not neighbours
			gapBefore:
				position > 0 && line.index - (shown[position - 1]?.index ?? 0) > 1,
		}),
	),
)
const hiddenCount = computed(() =>
	Math.max(changedLines.value.length - MAX_LINES, 0),
)
</script>

<template>
	<div class="flex max-w-[26rem] flex-col gap-1.5">
		<!-- the number column is as wide as its widest number -->
		<div
			class="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-1.5 gap-y-1.5 font-mono text-xs"
		>
			<template v-for="line in shownLines" :key="line.index">
				<!-- the negative margin reaches the popover's padding, so the
				separator runs from one edge of the card to the other -->
				<hr
					v-if="line.gapBefore"
					class="col-span-2 -mx-3 my-1.5 border-t border-dashed border-border"
				/>
				<span class="text-muted-foreground select-none">
					{{ line.number }}
				</span>
				<!-- only the segments keep their whitespace, so the template's own
				line breaks around them do not show as spaces -->
				<span class="break-all">
					<span
						v-for="(segment, i) in line.segments"
						:key="i"
						:class="
							cn(
								'whitespace-pre-wrap',
								segment.kind === TextSegmentKind.Removed &&
									'bg-diff-text-removed line-through',
								segment.kind === TextSegmentKind.Added && 'bg-diff-text-added',
							)
						"
						v-text="segment.text"
					/>
				</span>
			</template>
		</div>
		<span v-if="hiddenCount" class="text-xs text-muted-foreground">
			{{ $t("editor.mermaid.diff.more-lines", { count: hiddenCount }) }}
		</span>
	</div>
</template>
