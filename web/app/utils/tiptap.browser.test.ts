import { afterEach, beforeEach, describe, it, vi } from "vitest"
import {
	SCROLL_HIGHLIGHT_EDITOR_CLASS,
	clearTiptapScrollElementHighlightOverlays,
	highlightTiptapScrollElement,
	nodeOverlayOffset,
} from "./tiptap"

const OVERLAY_SELECTOR = ".editor-scroll-highlight"

// the page DOM and the stubbed globals (requestAnimationFrame,
// ResizeObserver, timers) are shared between tests, so they cannot
// interleave
describe("nodeOverlayOffset", { concurrent: false }, () => {
	afterEach(() => {
		document.body.innerHTML = ""
	})

	function attach<T extends HTMLElement>(el: T): T {
		document.body.appendChild(el)
		return el
	}

	it("returns zero offsets for a plain element", ({ expect }) => {
		expect(nodeOverlayOffset(attach(document.createElement("div")))).toEqual({
			extraTop: 0,
			extraBottom: 0,
			extraLeft: 0,
			extraRight: 0,
		})
	})

	it("pads list items on the left", ({ expect }) => {
		const el = attach(document.createElement("div"))
		el.setAttribute("data-type", "listItem")

		expect(nodeOverlayOffset(el)).toMatchObject({ extraLeft: 25 })
	})

	it("extends image blocks by the real image overhang", ({ expect }) => {
		const el = attach(document.createElement("div"))
		el.setAttribute("data-type", "imageBlock")
		el.style.width = "200px"
		const img = document.createElement("img")
		img.style.display = "block"
		img.style.width = "320px"
		el.appendChild(img)

		expect(nodeOverlayOffset(el)).toMatchObject({ extraRight: 120 })
	})

	it("returns zero offsets for an image block without an image", ({
		expect,
	}) => {
		const el = attach(document.createElement("div"))
		el.setAttribute("data-type", "imageBlock")

		expect(nodeOverlayOffset(el)).toMatchObject({ extraRight: 0 })
	})

	it("pads plain li elements on the left", ({ expect }) => {
		expect(
			nodeOverlayOffset(attach(document.createElement("li"))),
		).toMatchObject({ extraLeft: 25 })
	})

	it("starts a padded paragraph's panel at its text", ({ expect }) => {
		const el = attach(document.createElement("p"))
		el.style.paddingLeft = "12px"

		expect(nodeOverlayOffset(el)).toMatchObject({ extraLeft: -12 })
	})

	it("leaves task list items unpadded", ({ expect }) => {
		const el = attach(document.createElement("li"))
		el.setAttribute("data-checked", "false")

		expect(nodeOverlayOffset(el)).toMatchObject({ extraLeft: 0 })
	})

	it("leaves li elements containing a checkbox unpadded", ({ expect }) => {
		const el = attach(document.createElement("li"))
		const checkbox = document.createElement("input")
		checkbox.type = "checkbox"
		el.appendChild(checkbox)

		expect(nodeOverlayOffset(el)).toMatchObject({ extraLeft: 0 })
	})
})

describe("highlightTiptapScrollElement", { concurrent: false }, () => {
	class ResizeObserverStub {
		static instances: ResizeObserverStub[] = []

		observe = vi.fn()
		unobserve = vi.fn()
		disconnect = vi.fn()

		constructor(public callback: () => void) {
			ResizeObserverStub.instances.push(this)
		}
	}

	beforeEach(() => {
		ResizeObserverStub.instances = []
		vi.stubGlobal("ResizeObserver", ResizeObserverStub)

		// run animation frames synchronously so positioning is immediate
		// and deterministic
		vi.stubGlobal(
			"requestAnimationFrame",
			(cb: FrameRequestCallback): number => {
				cb(0)
				return 0
			},
		)
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	// a fixed-position container at (10, 10) with an absolutely
	// positioned target at (40, 20) inside it, so every rect the
	// overlay math reads comes from real layout
	function setupDom() {
		const container = document.createElement("div")
		container.className = SCROLL_HIGHLIGHT_EDITOR_CLASS
		container.style.position = "fixed"
		container.style.top = "10px"
		container.style.left = "10px"
		container.style.width = "400px"
		container.style.height = "300px"

		const target = document.createElement("div")
		target.style.position = "absolute"
		target.style.top = "20px"
		target.style.left = "40px"
		target.style.width = "100px"
		target.style.height = "20px"

		container.appendChild(target)
		document.body.appendChild(container)

		return { container, target }
	}

	// an editor at the container's top holding a 20px block and, below
	// it, the target in normal flow
	function setupEditorDom() {
		const { container, target } = setupDom()
		const editorEl = document.createElement("div")
		editorEl.className = "ProseMirror"
		const above = document.createElement("div")
		above.style.height = "20px"
		target.style.position = "static"
		editorEl.append(above, target)
		container.appendChild(editorEl)

		return { container, editorEl, target }
	}

	// mutation observers are called in a microtask after the change
	function mutationsDelivered() {
		return Promise.resolve()
	}

	function overlays() {
		return document.querySelectorAll(OVERLAY_SELECTOR)
	}

	it("does nothing without a highlight container", ({ expect }) => {
		const target = document.createElement("div")
		document.body.appendChild(target)

		highlightTiptapScrollElement("", target)

		expect(overlays()).toHaveLength(0)
	})

	it("does nothing for a disconnected element without an id fallback", ({
		expect,
	}) => {
		setupDom()

		highlightTiptapScrollElement("", document.createElement("div"))

		expect(overlays()).toHaveLength(0)
	})

	it("positions the overlay over the target's real layout", ({ expect }) => {
		const { target } = setupDom()

		highlightTiptapScrollElement("", target)

		const overlay = overlays()[0] as HTMLElement
		expect(overlay).toBeDefined()
		expect(ResizeObserverStub.instances[0]?.observe).toHaveBeenCalledWith(
			target,
		)
		// target rect (50, 30) relative to container rect (10, 10), minus
		// the 5px highlight offsets; size 100x20 plus 5px on each side
		expect(overlay.style.top).toBe("15px")
		expect(overlay.style.left).toBe("35px")
		expect(overlay.style.height).toBe("30px")
		expect(overlay.style.width).toBe("110px")
	})

	it("covers the whole titled code block for a link to one of its parts", ({
		expect,
	}) => {
		const { target } = setupDom()
		target.setAttribute("data-type", "titled-code-block")
		target.style.height = "60px"
		const code = document.createElement("pre")
		code.style.height = "20px"
		target.appendChild(code)

		highlightTiptapScrollElement("", code)

		const overlay = overlays()[0] as HTMLElement
		expect(ResizeObserverStub.instances[0]?.observe).toHaveBeenCalledWith(
			target,
		)
		expect(overlay.style.top).toBe("15px")
		expect(overlay.style.height).toBe("70px")
		expect(overlay.style.width).toBe("110px")
	})

	it("follows the target when a block above it grows", ({ expect }) => {
		const { editorEl, target } = setupEditorDom()
		const above = editorEl.firstElementChild as HTMLElement
		highlightTiptapScrollElement("", target)
		const overlay = overlays()[0] as HTMLElement
		const observer = ResizeObserverStub.instances[0]
		expect(overlay.style.top).toBe("15px")

		above.style.height = "50px"
		observer?.callback()

		expect.soft(observer?.observe).toHaveBeenCalledTimes(2)
		expect.soft(observer?.observe).toHaveBeenCalledWith(target)
		expect.soft(observer?.observe).toHaveBeenCalledWith(editorEl)
		expect.soft(overlay.style.top).toBe("45px")
	})

	it("follows a block that moves without changing the editor's height", async ({
		expect,
	}) => {
		const { editorEl, target } = setupEditorDom()
		target.id = "block-1"
		highlightTiptapScrollElement("block-1", target)
		const overlay = overlays()[0] as HTMLElement
		expect(overlay.style.top).toBe("15px")

		editorEl.prepend(target)
		await mutationsDelivered()

		expect(overlay.style.top).toBe("-5px")
	})

	it("follows a moved block that the editor drew as a new element", async ({
		expect,
	}) => {
		const { editorEl, target } = setupEditorDom()
		target.id = "block-1"
		highlightTiptapScrollElement("block-1", target)
		const overlay = overlays()[0] as HTMLElement
		const observer = ResizeObserverStub.instances[0]
		const redrawn = target.cloneNode(true) as HTMLElement

		target.remove()
		editorEl.prepend(redrawn)
		await mutationsDelivered()

		expect.soft(overlay.style.top).toBe("-5px")
		expect.soft(observer?.unobserve).toHaveBeenCalledExactlyOnceWith(target)
		expect.soft(observer?.observe).toHaveBeenLastCalledWith(redrawn)
	})

	it("removes the overlay and reports it when the block is deleted", async ({
		expect,
	}) => {
		vi.useFakeTimers()

		try {
			const { target } = setupEditorDom()
			target.id = "block-1"
			const onRemoved = vi.fn()
			highlightTiptapScrollElement("block-1", target, onRemoved)
			const overlay = overlays()[0] as HTMLElement
			const observer = ResizeObserverStub.instances[0]

			target.remove()
			await mutationsDelivered()
			vi.advanceTimersByTime(300)

			expect.soft(overlay.isConnected).toBe(false)
			expect.soft(observer?.disconnect).toHaveBeenCalledTimes(1)
			expect.soft(onRemoved).toHaveBeenCalledTimes(1)
		} finally {
			vi.useRealTimers()
		}
	})

	it("disconnects its observers when the editor is unmounted", ({ expect }) => {
		const { container, target } = setupEditorDom()
		highlightTiptapScrollElement("", target)
		const observer = ResizeObserverStub.instances[0]
		const disconnectMutations = vi.spyOn(
			MutationObserver.prototype,
			"disconnect",
		)

		container.remove()
		observer?.callback()

		expect.soft(observer?.disconnect).toHaveBeenCalledTimes(1)
		expect.soft(disconnectMutations).toHaveBeenCalledTimes(1)
		expect.soft(overlays()).toHaveLength(0)
	})

	it("falls back to looking the target up by id", ({ expect }) => {
		const { target } = setupDom()
		target.id = "block-1"

		highlightTiptapScrollElement("block-1", document.createElement("div"))

		expect(overlays()).toHaveLength(1)
	})

	it("replaces an existing overlay and disconnects its observer", ({
		expect,
	}) => {
		const { target } = setupDom()

		highlightTiptapScrollElement("", target)
		highlightTiptapScrollElement("", target)

		expect(overlays()).toHaveLength(1)
		expect(ResizeObserverStub.instances[0]?.disconnect).toHaveBeenCalledTimes(1)
	})

	it("leaves the overlay unpositioned when the target has no size", ({
		expect,
	}) => {
		const { target } = setupDom()
		target.style.display = "none"

		highlightTiptapScrollElement("", target)

		const overlay = overlays()[0] as HTMLElement
		expect(overlay).toBeDefined()
		expect(overlay.style.top).toBe("")
	})
})

describe(
	"clearTiptapScrollElementHighlightOverlays",
	{ concurrent: false },
	() => {
		afterEach(() => {
			document.body.innerHTML = ""
		})

		function appendOverlay() {
			const overlay = document.createElement("div") as HTMLElement & {
				_cleanup?: () => void
			}
			overlay.className = "editor-scroll-highlight"
			overlay._cleanup = vi.fn()
			document.body.appendChild(overlay)

			return overlay
		}

		it("hides overlays immediately and removes them after the fade", ({
			expect,
		}) => {
			vi.useFakeTimers()

			try {
				const overlay = appendOverlay()

				clearTiptapScrollElementHighlightOverlays()

				expect(overlay.hasAttribute("data-hidden")).toBe(true)
				expect(overlay.isConnected).toBe(true)

				vi.advanceTimersByTime(300)

				expect(overlay.isConnected).toBe(false)
				expect(overlay._cleanup).toHaveBeenCalledTimes(1)
			} finally {
				vi.useRealTimers()
			}
		})
	},
)
