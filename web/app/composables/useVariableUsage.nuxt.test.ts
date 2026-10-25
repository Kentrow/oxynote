import type { Editor } from "@tiptap/core"
import { Schema, type Node as PMNode } from "@tiptap/pm/model"
import { afterEach, beforeEach, describe, it, vi } from "vitest"
import { effectScope, type EffectScope } from "vue"
import { METRIC_BLOCK_NAME } from "~/components/editor/blocks/node-names"
import {
	VAR_ENV,
	VAR_RANGE,
	VAR_REGION,
	fullTree,
	mockTree,
} from "~/components/variables/test-helpers"
import {
	clearQueryCache,
	disposeMockEndpoints,
	runInApp,
} from "./api/test-helpers"
import { useVariableUsage } from "./useVariableUsage"

const SCHEMA = new Schema({
	nodes: {
		doc: { content: "block+" },
		paragraph: { group: "block", content: "text*" },
		[METRIC_BLOCK_NAME]: {
			group: "block",
			attrs: { timeRange: { default: null } },
		},
		text: {},
	},
})

let scope: EffectScope | null = null

// the tree is one app-wide cache entry and the debounce runs on the
// global fake timers, so the tests cannot interleave
describe("useVariableUsage", { concurrent: false }, () => {
	beforeEach(() => {
		clearQueryCache()
		mockTree(fullTree())
	})
	afterEach(() => {
		scope?.stop()
		scope = null
		vi.useRealTimers()
		disposeMockEndpoints()
	})

	it("reports the variables the page references and how many exist", ({
		expect,
	}) => {
		const usage = follow(ref(fakeEditor(page("Deploys to $env"))))

		expect([...usage.usedVariableIds.value]).toEqual([VAR_ENV])
		expect(usage.totalCount.value).toBe(4)
	})

	it("counts a built-in as used by a metric chart that follows it", ({
		expect,
	}) => {
		const usage = follow(ref(fakeEditor(page(null, true))))

		expect([...usage.usedVariableIds.value]).toEqual([VAR_RANGE])
	})

	it("follows the page's edits once they settle", async ({ expect }) => {
		vi.useFakeTimers()
		const editor = fakeEditor(page("Deploys to $env"))
		const usage = follow(ref(editor))

		editor.state.doc = page("Runs in $region")
		editor.emit("update")
		const before = [...usage.usedVariableIds.value]
		await vi.advanceTimersByTimeAsync(300)

		expect(before).toEqual([VAR_ENV])
		expect([...usage.usedVariableIds.value]).toEqual([VAR_REGION])
	})

	it("reports nothing without an editor", ({ expect }) => {
		const usage = follow(ref(null))

		expect(usage.usedVariableIds.value.size).toBe(0)
	})

	it("forgets the page once its editor is destroyed", ({ expect }) => {
		const editor = fakeEditor(page("Deploys to $env"))
		const usage = follow(ref(editor))

		editor.emit("destroy")

		expect(usage.usedVariableIds.value.size).toBe(0)
	})

	it("stops listening to an editor it no longer follows", async ({
		expect,
	}) => {
		const first = fakeEditor(page("Deploys to $env"))
		const editor = ref<FakeEditor | null>(first)
		const usage = follow(editor)

		editor.value = fakeEditor(page("Runs in $region"))
		await nextTick()
		first.emit("destroy")

		expect(first.listenerCount()).toBe(0)
		expect([...usage.usedVariableIds.value]).toEqual([VAR_REGION])
	})
})

// the stand-in offers only what the composable reads, so it passes for an
// editor by a cast
function follow(editor: Ref<FakeEditor | null>) {
	scope = effectScope()

	const usage = scope.run(() =>
		runInApp(() => useVariableUsage(editor as unknown as Ref<Editor | null>)),
	)
	if (!usage) {
		throw new Error("the composable did not run")
	}

	return usage
}

function page(text: string | null, metricChart = false): PMNode {
	return SCHEMA.node("doc", null, [
		SCHEMA.node("paragraph", null, text ? [SCHEMA.text(text)] : []),
		...(metricChart
			? [SCHEMA.node(METRIC_BLOCK_NAME, { timeRange: "$metric_range" })]
			: []),
	])
}

// the composable reads the document off the editor's state and listens
// for its update and destroy events, which is all this stand-in offers
function fakeEditor(doc: PMNode) {
	const listeners = new Map<string, Set<() => void>>()

	const editor = {
		isDestroyed: false,
		state: { doc: doc },
		on(event: string, fn: () => void) {
			const set = listeners.get(event) ?? new Set()
			set.add(fn)
			listeners.set(event, set)
		},
		off(event: string, fn: () => void) {
			listeners.get(event)?.delete(fn)
		},
		emit(event: string) {
			listeners.get(event)?.forEach((fn) => {
				fn()
			})
		},
		listenerCount() {
			return [...listeners.values()].reduce((n, set) => n + set.size, 0)
		},
	}

	return editor
}

type FakeEditor = ReturnType<typeof fakeEditor>
