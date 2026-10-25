import { type JSONContent, Node as TiptapNode } from "@tiptap/core"
import type { Plugin } from "@tiptap/pm/state"
import {
	METRIC_BLOCK_NAME,
	SPLIT_DOCUMENTATION_LEFT_SIDE_NAME,
	SPLIT_DOCUMENTATION_NAME,
	SPLIT_DOCUMENTATION_RIGHT_SIDE_NAME,
} from "../blocks/node-names"
import { GapDecorations } from "./gap-decorations"

// a split documentation whose right side holds metric blocks straight,
// with no grid around them, the way a new document's starts out
export const SplitDocumentationStub = TiptapNode.create({
	name: SPLIT_DOCUMENTATION_NAME,
	group: "block",
	content: `${SPLIT_DOCUMENTATION_LEFT_SIDE_NAME} ${SPLIT_DOCUMENTATION_RIGHT_SIDE_NAME}`,

	renderHTML() {
		return ["div", 0]
	},
})

export const SplitDocumentationLeftSideStub = TiptapNode.create({
	name: SPLIT_DOCUMENTATION_LEFT_SIDE_NAME,
	content: "paragraph+",

	renderHTML() {
		return ["div", 0]
	},
})

export const SplitDocumentationRightSideStub = TiptapNode.create({
	name: SPLIT_DOCUMENTATION_RIGHT_SIDE_NAME,
	content: `${METRIC_BLOCK_NAME}+`,

	renderHTML() {
		return ["div", 0]
	},
})

// addProseMirrorPlugins reads neither this.options nor this.editor, so
// a bare context stands in for the extension instance the editor
// normally binds it to
export function gapPlugin(): Plugin {
	const addProseMirrorPlugins = GapDecorations.config.addProseMirrorPlugins

	if (!addProseMirrorPlugins) {
		throw new Error("GapDecorations declares no prosemirror plugins")
	}

	const plugin = addProseMirrorPlugins.call({} as never)[0]

	if (!plugin) {
		throw new Error("GapDecorations produced no prosemirror plugin")
	}

	return plugin
}

export function bulletList(...items: JSONContent[]): JSONContent {
	return { type: "bulletList", content: items }
}

export function taskList(...items: JSONContent[]): JSONContent {
	return { type: "taskList", content: items }
}
