import { afterEach, beforeEach, describe, it, onTestFinished, vi } from "vitest"
import { bindTouchLongPress } from "./long-press"

// fake timers, global pointer listeners, the document's classes and its
// selection are shared.
describe("bindTouchLongPress", { concurrent: false }, () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		document.getSelection()?.removeAllRanges()
		vi.useRealTimers()
	})

	it("opens once after a stationary primary touch lasts 300 ms", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const event = pointer(element, "pointerdown")
		vi.advanceTimersByTime(299)
		expect(onHold).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(event)
		expect.soft(event.defaultPrevented).toBe(false)
	})

	it.for([
		{ name: "mouse", input: { pointerType: "mouse" } },
		{ name: "pen on a screen that hovers", input: { pointerType: "pen" } },
		{ name: "secondary touch", input: { isPrimary: false } },
		{ name: "secondary button", input: { button: 2 } },
	])("ignores $name presses", ({ input }, { expect }) => {
		const { element, onHold } = mount()

		pointer(element, "pointerdown", input)
		vi.advanceTimersByTime(300)

		expect(onHold).not.toHaveBeenCalled()
	})

	it("opens for a pen on a screen that cannot hover", ({ expect }) => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn((query: string) => ({ matches: query === "(hover: none)" })),
		)
		const { element, onHold } = mount()
		const event = pointer(element, "pointerdown", { pointerType: "pen" })

		vi.advanceTimersByTime(300)

		expect(onHold).toHaveBeenCalledExactlyOnceWith(event)
	})

	it("leaves an already handled pointer press alone", ({ expect }) => {
		const { element, onHold } = mount()
		const event = touchEvent("pointerdown")
		event.preventDefault()

		element.dispatchEvent(event)
		vi.advanceTimersByTime(300)

		expect(onHold).not.toHaveBeenCalled()
	})

	it.for([
		{ name: "links", input: () => document.createElement("a") },
		{ name: "buttons", input: () => document.createElement("button") },
		{ name: "inputs", input: () => document.createElement("input") },
		{ name: "textareas", input: () => document.createElement("textarea") },
		{ name: "selects", input: () => document.createElement("select") },
		{ name: "role=button elements", input: roleButton },
	])("leaves $name and their children alone", ({ input }, { expect }) => {
		const { element, onHold } = mount()
		const control = input()
		const child = document.createElement("span")
		control.append(child)
		element.append(control)

		pointer(child, "pointerdown")
		vi.advanceTimersByTime(300)

		expect(onHold).not.toHaveBeenCalled()
	})

	it("holds a control inside an allowed target", ({ expect }) => {
		const { element, onHold } = mount()
		const allowed = document.createElement("div")
		allowed.dataset.holdOpensMenu = ""
		const control = document.createElement("button")
		allowed.append(control)
		element.append(allowed)

		const event = pointer(control, "pointerdown")
		vi.advanceTimersByTime(300)

		expect(onHold).toHaveBeenCalledExactlyOnceWith(event)
	})

	it("keeps the release click from the allowed control it held", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const allowed = document.createElement("div")
		allowed.dataset.holdOpensMenu = ""
		const control = document.createElement("button")
		const onClick = vi.fn()
		control.addEventListener("click", onClick)
		allowed.append(control)
		element.append(allowed)
		const down = pointer(control, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(control, "pointerup")

		const click = mouse(control, "click")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(click.defaultPrevented).toBe(true)
		expect.soft(onClick).not.toHaveBeenCalled()
	})

	it("allows noneditable atom wrappers to open their block menu", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const atom = document.createElement("div")
		atom.contentEditable = "false"
		atom.dataset.nodeViewWrapper = ""
		element.append(atom)

		const event = pointer(atom, "pointerdown")
		vi.advanceTimersByTime(300)

		expect(onHold).toHaveBeenCalledExactlyOnceWith(event)
	})

	it("leaves a touch inside a text selection to the platform", ({ expect }) => {
		const { element, onHold } = mount()
		const rect = selectText(element)

		pointer(element, "pointerdown", {
			clientX: rect.left + 1,
			clientY: rect.top + 1,
		})
		vi.advanceTimersByTime(300)

		expect.soft(onHold).not.toHaveBeenCalled()
		expect.soft(document.getSelection()?.toString()).toBe("block text")
	})

	it("holds a block outside the text selection", ({ expect }) => {
		const { element, onHold } = mount()
		const other = mount().element
		selectText(other)
		const rect = element.getBoundingClientRect()

		const event = pointer(element, "pointerdown", {
			clientX: rect.left + 1,
			clientY: rect.top + 1,
		})
		vi.advanceTimersByTime(300)

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(event)
		expect.soft(document.getSelection()?.toString()).toBe("block text")
	})

	it("does not clear a selection made during the hold", ({ expect }) => {
		const { element, onHold } = mount()
		const event = pointer(element, "pointerdown")
		selectText(element)

		vi.advanceTimersByTime(300)

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(event)
		expect.soft(document.getSelection()?.toString()).toBe("block text")
	})

	it("allows small finger movements without preventing their default", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		const move = pointer(document, "pointermove", { clientX: 6, clientY: 7 })

		vi.advanceTimersByTime(300)

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(move.defaultPrevented).toBe(false)
	})

	it("cancels when the finger moves ten pixels and does not restart", ({
		expect,
	}) => {
		const { element, onHold, onHoldMove } = mount()
		pointer(element, "pointerdown")
		pointer(document, "pointermove", { clientX: 6, clientY: 8 })
		pointer(document, "pointermove")

		vi.advanceTimersByTime(300)

		expect.soft(onHold).not.toHaveBeenCalled()
		expect.soft(onHoldMove).not.toHaveBeenCalled()
	})

	it.for(["pointerup", "pointercancel"])(
		"cancels on %s before the hold opens",
		(type, { expect }) => {
			const { element, onHold, onHoldEnd } = mount()
			pointer(element, "pointerdown")

			const event = pointer(document, type)
			vi.advanceTimersByTime(300)

			expect.soft(onHold).not.toHaveBeenCalled()
			expect.soft(onHoldEnd).not.toHaveBeenCalled()
			expect.soft(event.defaultPrevented).toBe(false)
		},
	)

	it.for(["pointermove", "pointerup", "pointercancel"])(
		"ignores another pointer's %s",
		(type, { expect }) => {
			const { element, onHold } = mount()
			const down = pointer(element, "pointerdown")

			pointer(document, type, { pointerId: 2, clientX: 100 })
			vi.advanceTimersByTime(300)

			expect(onHold).toHaveBeenCalledExactlyOnceWith(down)
		},
	)

	it("cancels a pending hold when a second finger touches", ({ expect }) => {
		const { element, onHold } = mount()
		pointer(element, "pointerdown")

		pointer(document.body, "pointerdown", { pointerId: 2, isPrimary: false })
		vi.advanceTimersByTime(300)

		expect(onHold).not.toHaveBeenCalled()
	})

	it("keeps an opened hold from picking a menu item after a second finger touches", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const { item, onClick } = menuItemUnderFinger()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document.body, "pointerdown", { pointerId: 2, isPrimary: false })

		const up = pointer(item, "pointerup")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(up.defaultPrevented).toBe(true)
		expect.soft(onClick).not.toHaveBeenCalled()
	})

	it.for(["scroll", "blur"])(
		"cancels when the window receives %s",
		(type, { expect }) => {
			const { element, onHold } = mount()
			pointer(element, "pointerdown")

			window.dispatchEvent(new Event(type))
			vi.advanceTimersByTime(300)

			expect(onHold).not.toHaveBeenCalled()
		},
	)

	it("cancels when a nested scroll container scrolls", ({ expect }) => {
		const { element, onHold } = mount()
		pointer(element, "pointerdown")

		element.dispatchEvent(new Event("scroll"))
		vi.advanceTimersByTime(300)

		expect(onHold).not.toHaveBeenCalled()
	})

	it("makes the page unselectable once the hold opens", ({ expect }) => {
		const { element } = mount()
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(299)
		expect(heldClasses()).toEqual([false, false])

		vi.advanceTimersByTime(1)

		expect(heldClasses()).toEqual([true, true])
	})

	it("leaves the page selectable when the callback declines", ({ expect }) => {
		const { element, onHold } = mount({ result: false })
		const down = pointer(element, "pointerdown")

		vi.advanceTimersByTime(300)

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(heldClasses()).toEqual([false, false])
	})

	it.for(["pointerup", "pointercancel"])(
		"makes the page selectable again on %s",
		(type, { expect }) => {
			const { element } = mount()
			pointer(element, "pointerdown")
			vi.advanceTimersByTime(300)

			pointer(document, type)

			expect(heldClasses()).toEqual([false, false])
		},
	)

	it("takes pointer events from the element once the hold opens", ({
		expect,
	}) => {
		const { element } = mount()
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(299)
		expect(element.style.pointerEvents).toBe("")

		vi.advanceTimersByTime(1)

		expect(element.style.pointerEvents).toBe("none")
	})

	it("keeps pointer events away while the held finger stays near", ({
		expect,
	}) => {
		const { element, onHoldMove } = mount()
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const move = pointer(document, "pointermove", { clientX: 6, clientY: 7 })

		expect.soft(element.style.pointerEvents).toBe("none")
		expect.soft(onHoldMove).toHaveBeenCalledExactlyOnceWith(move)
	})

	it("gives pointer events back once the held finger moves off to drag", ({
		expect,
	}) => {
		const { element, onHoldMove } = mount()
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const move = pointer(document, "pointermove", { clientX: 6, clientY: 8 })

		expect.soft(element.style.pointerEvents).toBe("")
		expect.soft(onHoldMove).toHaveBeenCalledExactlyOnceWith(move)
	})

	it.for(["pointerup", "pointercancel"])(
		"gives pointer events back on %s",
		(type, { expect }) => {
			const { element } = mount()
			pointer(element, "pointerdown")
			vi.advanceTimersByTime(300)

			pointer(document, type)

			expect(element.style.pointerEvents).toBe("")
		},
	)

	it("gives pointer events back when two bindings hold one element", ({
		expect,
	}) => {
		const { element } = mount()
		const dispose = bindTouchLongPress(element, { onHold: () => true })
		onTestFinished(dispose)
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document, "pointermove", { clientX: 6, clientY: 8 })

		pointer(document, "pointerup", { clientX: 6, clientY: 8 })

		expect(element.style.pointerEvents).toBe("")
	})

	it("leaves pointer events alone when the callback declines", ({ expect }) => {
		const { element } = mount({ result: false })
		pointer(element, "pointerdown")

		vi.advanceTimersByTime(300)

		expect(element.style.pointerEvents).toBe("")
	})

	it("stops the held finger from scrolling the page", ({ expect }) => {
		const { element } = mount()
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const move = touchMove(element)

		expect(move.defaultPrevented).toBe(true)
	})

	it.for([
		{
			name: "pointermove",
			input: () => touchEvent("pointermove", { clientX: 40 }),
		},
		{
			name: "touchmove",
			input: () => new Event("touchmove", { bubbles: true, cancelable: true }),
		},
	])(
		"keeps the held finger's $name from what lies under it",
		({ name, input }, { expect }) => {
			const { element } = mount()
			const chart = document.createElement("div")
			element.append(chart)
			const onMove = vi.fn()
			chart.addEventListener(name, onMove)
			pointer(chart, "pointerdown")
			vi.advanceTimersByTime(300)

			chart.dispatchEvent(input())

			expect(onMove).not.toHaveBeenCalled()
		},
	)

	it("lets moves reach what lies under the finger before the hold opens", ({
		expect,
	}) => {
		const { element } = mount()
		const chart = document.createElement("div")
		element.append(chart)
		const onMove = vi.fn()
		chart.addEventListener("pointermove", onMove)
		pointer(chart, "pointerdown")
		vi.advanceTimersByTime(299)

		const move = pointer(chart, "pointermove", { clientX: 4 })

		expect(onMove).toHaveBeenCalledExactlyOnceWith(move)
	})

	it("lets the finger scroll before the hold opens", ({ expect }) => {
		const { element } = mount()
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(299)

		const move = touchMove(element)

		expect(move.defaultPrevented).toBe(false)
	})

	it("reports each move of the held finger", ({ expect }) => {
		const { element, onHold, onHoldMove, onHoldEnd } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const move = pointer(document, "pointermove", { clientX: 40, clientY: 50 })

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(onHoldMove).toHaveBeenCalledExactlyOnceWith(move)
		expect.soft(onHoldEnd).not.toHaveBeenCalled()
	})

	it.for([
		{ name: "pointerup", expected: true },
		{ name: "pointercancel", expected: false },
	])("reports the $name that ends a hold", ({ name, expected }, { expect }) => {
		const { element, onHold, onHoldMove, onHoldEnd } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const end = pointer(document, name)

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(onHoldEnd).toHaveBeenCalledExactlyOnceWith(end)
		expect.soft(onHoldMove).not.toHaveBeenCalled()
		expect.soft(end.defaultPrevented).toBe(expected)
	})

	it("reports no end for a hold the callback declined", ({ expect }) => {
		const { element, onHoldEnd } = mount({ result: false })
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		pointer(document, "pointerup")

		expect(onHoldEnd).not.toHaveBeenCalled()
	})

	it("keeps native context menus before the long press succeeds", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		pointer(element, "pointerdown")

		const context = mouse(element, "contextmenu")

		expect.soft(onHold).not.toHaveBeenCalled()
		expect.soft(context.defaultPrevented).toBe(false)
	})

	it("suppresses native context menus while the hold is open", ({ expect }) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const context = mouse(element, "contextmenu")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(context.defaultPrevented).toBe(true)
	})

	it("suppresses a native context menu retargeted to the menu portal", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const context = mouse(document.body, "contextmenu")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(context.defaultPrevented).toBe(true)
	})

	it("keeps portal context suppression bounded after a successful hold is cancelled", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(element, "pointercancel")

		const context = mouse(document.body, "contextmenu")
		vi.advanceTimersByTime(800)
		const laterContext = mouse(document.body, "contextmenu")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(context.defaultPrevented).toBe(true)
		expect.soft(laterContext.defaultPrevented).toBe(false)
	})

	it("suppresses a late release click after native handling cancels the hold", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		const cancelled = pointer(document, "pointercancel")

		const click = mouse(document.body, "click")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(cancelled.defaultPrevented).toBe(false)
		expect.soft(click.defaultPrevented).toBe(true)
	})

	it.for(["pointerup", "pointercancel"])(
		"allows a portal context menu from the next deliberate press after %s",
		(type, { expect }) => {
			const { element, onHold } = mount()
			const down = pointer(element, "pointerdown")
			vi.advanceTimersByTime(300)
			pointer(document, type)
			pointer(document.body, "pointerdown")

			const context = mouse(document.body, "contextmenu")

			expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
			expect.soft(context.defaultPrevented).toBe(false)
		},
	)

	it("allows portal context menus after the release window expires", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document, "pointerup")
		vi.advanceTimersByTime(800)

		const context = mouse(document.body, "contextmenu")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(context.defaultPrevented).toBe(false)
	})

	it("leaves click and context menu behavior intact when the callback declines", ({
		expect,
	}) => {
		const { element, onHold } = mount({ result: false })
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(element, "pointerup")

		const context = mouse(element, "contextmenu")
		const click = mouse(element, "click")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(context.defaultPrevented).toBe(false)
		expect.soft(click.defaultPrevented).toBe(false)
	})

	it("suppresses the release click even when it targets a menu portal", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document, "pointerup")
		const onClick = vi.fn()
		document.body.addEventListener("click", onClick, { once: true })
		onTestFinished(() => {
			document.body.removeEventListener("click", onClick)
		})

		const click = mouse(document.body, "click")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(click.defaultPrevented).toBe(true)
		expect.soft(onClick).not.toHaveBeenCalled()
	})

	it("lets the next deliberate tap choose a menu item", ({ expect }) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document, "pointerup")
		pointer(document.body, "pointerdown")
		pointer(document.body, "pointerup")

		const click = mouse(document.body, "click")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(click.defaultPrevented).toBe(false)
	})

	it("does not activate a menu item beneath the finger on release", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const { item, onClick } = menuItemUnderFinger()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const up = pointer(item, "pointerup")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(up.defaultPrevented).toBe(true)
		expect.soft(onClick).not.toHaveBeenCalled()
	})

	it("keeps release suppression when opening the menu moves focus", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const { item } = menuItemUnderFinger()
		element.focus()
		onHold.mockImplementation(() => {
			item.focus()
			return true
		})
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		const up = pointer(item, "pointerup")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(document.activeElement).toBe(item)
		expect.soft(up.defaultPrevented).toBe(true)
	})

	it("keeps release suppression when the finger moves after opening", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document, "pointermove", { clientX: 20 })

		const up = pointer(document, "pointerup", { clientX: 20 })

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(up.defaultPrevented).toBe(true)
	})

	it("keeps release suppression when the page scrolls after opening", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		window.dispatchEvent(new Event("scroll"))

		const up = pointer(document, "pointerup")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(up.defaultPrevented).toBe(true)
	})

	it("does not suppress keyboard clicks", ({ expect }) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document, "pointerup")

		const click = mouse(element, "click", 0)

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(click.defaultPrevented).toBe(false)
	})

	it("expires release suppression when the browser emits no click", ({
		expect,
	}) => {
		const { element, onHold } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)
		pointer(document, "pointerup")
		vi.advanceTimersByTime(800)

		const click = mouse(element, "click")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(click.defaultPrevented).toBe(false)
	})

	it("cancels pending work and removes listeners when disposed", ({
		expect,
	}) => {
		const { element, onHold, dispose } = mount()
		pointer(element, "pointerdown")

		dispose()
		vi.advanceTimersByTime(300)
		pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		expect(onHold).not.toHaveBeenCalled()
	})

	it("removes release suppression and the page lock when disposed during a hold", ({
		expect,
	}) => {
		const { element, onHold, dispose } = mount()
		const down = pointer(element, "pointerdown")
		vi.advanceTimersByTime(300)

		dispose()
		const context = mouse(element, "contextmenu")
		const click = mouse(element, "click")

		expect.soft(onHold).toHaveBeenCalledExactlyOnceWith(down)
		expect.soft(context.defaultPrevented).toBe(false)
		expect.soft(click.defaultPrevented).toBe(false)
		expect.soft(heldClasses()).toEqual([false, false])
		expect.soft(element.style.pointerEvents).toBe("")
	})
})

function mount({ result = true } = {}) {
	const element = document.createElement("div")
	element.contentEditable = "true"
	element.textContent = "block text"
	document.body.append(element)
	const onHold = vi.fn((_event: PointerEvent) => result)
	const onHoldMove = vi.fn()
	const onHoldEnd = vi.fn()
	const dispose = bindTouchLongPress(element, {
		onHold,
		onHoldMove,
		onHoldEnd,
	})
	onTestFinished(() => {
		dispose()
		element.remove()
	})

	return { element, onHold, onHoldMove, onHoldEnd, dispose }
}

// a menu item that, like reka's, turns a pointerup into a click
function menuItemUnderFinger() {
	const item = document.createElement("button")
	document.body.append(item)
	const onClick = vi.fn()
	item.addEventListener("click", onClick)
	item.addEventListener("pointerup", () => {
		item.click()
	})
	onTestFinished(() => {
		item.remove()
	})

	return { item, onClick }
}

function roleButton() {
	const control = document.createElement("div")
	control.setAttribute("role", "button")

	return control
}

function touchEvent(type: string, init: PointerEventInit = {}) {
	return new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		pointerType: "touch",
		pointerId: 1,
		isPrimary: true,
		button: 0,
		...init,
	})
}

function pointer(target: EventTarget, type: string, init?: PointerEventInit) {
	const event = touchEvent(type, init)
	target.dispatchEvent(event)

	return event
}

function touchMove(target: EventTarget) {
	const event = new Event("touchmove", { bubbles: true, cancelable: true })
	target.dispatchEvent(event)

	return event
}

function mouse(target: EventTarget, type: string, detail = 1) {
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		detail,
	})
	target.dispatchEvent(event)

	return event
}

function selectText(element: HTMLElement) {
	const range = document.createRange()
	range.selectNodeContents(element)
	document.getSelection()?.addRange(range)

	return range.getBoundingClientRect()
}

function heldClasses() {
	const classes = document.documentElement.classList

	return [
		classes.contains("select-none"),
		classes.contains("[-webkit-touch-callout:none]"),
	]
}
