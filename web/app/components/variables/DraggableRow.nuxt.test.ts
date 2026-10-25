import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { enableAutoUnmount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { at } from "../test-helpers"
import DraggableRow from "./DraggableRow.vue"
import { draggableItem } from "./variables"

interface CapturedDragOptions {
	onStart?: () => void
	onMove?: (pos: { x: number; y: number }) => void
	onEnd?: () => void
}

// happy-dom has no layout, so the vueuse pointer and geometry primitives
// the drag rides on are stubbed and driven directly, as SidebarItem's
// suite does
const {
	capturedDrags,
	capturedMice,
	useDraggableMock,
	useMouseInElementMock,
	useElementBoundingMock,
} = vi.hoisted(() => {
	const capturedDrags: CapturedDragOptions[] = []
	const capturedMice: { isOutside: Ref<boolean> }[] = []

	return {
		capturedDrags,
		capturedMice,
		useDraggableMock: vi.fn((_el: unknown, opts: CapturedDragOptions): any => {
			capturedDrags.push(opts)

			return { x: ref(0), y: ref(0) }
		}),
		useMouseInElementMock: vi.fn((): any => {
			const mouse = { isOutside: ref(true) }
			capturedMice.push(mouse)

			return mouse
		}),
		useElementBoundingMock: vi.fn((): any => ({
			width: ref(0),
			height: ref(0),
		})),
	}
})

mockNuxtImport("useDraggable", () => useDraggableMock)
mockNuxtImport("useMouseInElement", () => useMouseInElementMock)
mockNuxtImport("useElementBounding", () => useElementBoundingMock)

// each row asks for its own mouse first and its top edge second
const DRAGGED_ROW = 0
const TARGET_ROW = 2
const TARGET_ROW_TOP_EDGE = 3

// the geometry mocks and the drag store behind them are module-level
// singletons every mount in the file shares
describe("<DraggableRow>", { concurrent: false }, () => {
	beforeEach(() => {
		capturedMice.forEach((mouse) => {
			mouse.isOutside.value = true
		})
		capturedDrags.length = 0
		capturedMice.length = 0
	})
	afterEach(() => {
		capturedDrags.forEach((drag) => drag.onEnd?.())
	})
	// a row left mounted would answer the next test's drag with a ghost of
	// its own whenever it shares the dragged row's id
	enableAutoUnmount(afterEach)

	it("gives a row that cannot be dragged no top edge to drop on", async ({
		expect,
	}) => {
		const wrapper = await mountSuspended(DraggableRow, {
			props: { item: row("a", { draggable: false }) },
		})

		expect(wrapper.find(".-top-1\\.5").exists()).toBe(false)
	})

	it("shows a ghost of itself once dragged", async ({ expect }) => {
		await mountPair(true)

		await startDrag()

		expect(document.body.querySelector("[data-ghost]")?.textContent).toBe("a")
	})

	it("leaves the ghost to the dragged row when a drop row shares its id", async ({
		expect,
	}) => {
		const items = [
			row("a"),
			row("a", { draggable: false, acceptsChildren: true }),
		]
		const Rows = defineComponent({
			setup() {
				return () =>
					items.map((item, index) =>
						h(DraggableRow, { key: index, item: item }, () => `row-${index}`),
					)
			},
		})
		await mountSuspended(Rows)

		await startDrag()

		const ghosts = document.body.querySelectorAll("[data-ghost]")
		expect(Array.from(ghosts).map((g) => g.textContent)).toEqual(["row-0"])
	})

	it("shows its own ghost content when it brings one", async ({ expect }) => {
		const Ghosted = defineComponent({
			setup() {
				return () =>
					h(
						DraggableRow,
						{ item: row("a") },
						{
							default: () => "row",
							ghost: () => "row and its children",
						},
					)
			},
		})
		await mountSuspended(Ghosted)

		await startDrag()

		expect(document.body.querySelector("[data-ghost]")?.textContent).toBe(
			"row and its children",
		)
	})

	it("asks to be moved before the row whose top edge it was dropped on", async ({
		expect,
	}) => {
		const dragged = await mountPair(false)
		await startDrag()

		await hover(TARGET_ROW_TOP_EDGE)
		endDrag()

		expect(dragged.emitted("move")).toEqual([
			[{ parentId: "group", insertBeforeId: "b" }],
		])
	})

	it("asks to be moved to the end of a row that takes children", async ({
		expect,
	}) => {
		const dragged = await mountPair(true)
		await startDrag()

		await hover(TARGET_ROW)
		endDrag()

		expect(dragged.emitted("move")).toEqual([
			[{ parentId: "b", insertBeforeId: null }],
		])
	})

	it("asks for nothing when the drag ends away from every row", async ({
		expect,
	}) => {
		const dragged = await mountPair(true)
		await startDrag()

		endDrag()

		expect(dragged.emitted("move")).toBeUndefined()
	})
})

function row(
	id: string,
	overrides: { draggable?: boolean; acceptsChildren?: boolean } = {},
) {
	return draggableItem({
		id: id,
		parentId: "group",
		dragGroup: "rows",
		draggable: overrides.draggable ?? true,
		acceptsChildren: overrides.acceptsChildren ?? false,
	})
}

// two rows under one parent: a drop target has to be a different row, and
// rows coordinate through an app-wide store. The items are built once, so
// a render never hands either row a new identity.
async function mountPair(targetTakesChildren: boolean) {
	const items = [row("a"), row("b", { acceptsChildren: targetTakesChildren })]
	const Pair = defineComponent({
		setup() {
			return () =>
				items.map((item) =>
					h(DraggableRow, { key: item.id, item: item }, () => item.id),
				)
		},
	})
	const wrapper = await mountSuspended(Pair)

	return at(wrapper.findAllComponents(DraggableRow), DRAGGED_ROW)
}

// the composable only treats a pointer move past minDistance as a drag
async function startDrag() {
	const drag = at(capturedDrags, DRAGGED_ROW)
	drag.onStart?.()
	drag.onMove?.({ x: 0, y: 0 })
	drag.onMove?.({ x: 0, y: 100 })
	await nextTick()
}

function endDrag() {
	at(capturedDrags, DRAGGED_ROW).onEnd?.()
}

async function hover(mouseIndex: number) {
	at(capturedMice, mouseIndex).isOutside.value = false
	await nextTick()
}
