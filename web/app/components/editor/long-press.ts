// below Android's default long press of 400 ms, so the hold opens its menu
// before the platform starts a text selection
const LONG_PRESS_DELAY = 300
// how far the finger moves before it counts as moving. That drops a
// pending hold, or gives a held element its pointer events back, so a
// drag of the held block can start no sooner.
export const MOVE_THRESHOLD = 10
const RELEASE_CLICK_DELAY = 800
const INTERACTIVE_TARGETS =
	'a, button, input, textarea, select, [role="button"]'
// a control inside this attribute still starts a hold, such as the title icon
const HOLD_ALLOWED_TARGETS = "[data-hold-opens-menu]"
// iOS sends no contextmenu event to cancel, so its own long press is held
// off by making the page unselectable while the finger is down
const HELD_CLASSES = ["select-none", "[-webkit-touch-callout:none]"]

export interface LongPressHandlers {
	// returns whether the hold opened something. Only then is the release
	// kept from reaching what lies under the finger.
	onHold: (event: PointerEvent) => boolean
	// every move of the held finger, which no longer scrolls the page
	onHoldMove?: (event: PointerEvent) => void
	// the pointerup or pointercancel that ends a hold
	onHoldEnd?: (event: PointerEvent) => void
}

export function bindTouchLongPress(
	element: HTMLElement,
	handlers: LongPressHandlers,
): () => void {
	const controller = new AbortController()
	const options = { capture: true, signal: controller.signal }
	// the touch waiting out the delay, and then the hold it became
	let press: PointerEvent | null = null
	let held = false
	let timer: ReturnType<typeof setTimeout> | undefined
	let releaseUntil = 0
	// WebKit lets editable text start a selection whatever user-select says,
	// so iOS would still run its own long press over the held text. The held
	// element takes no pointer events, which leaves that long press nothing
	// to select, until the finger moves off to drag and needs the page again.
	// The bound elements set no pointer-events of their own, so giving them
	// back clears the property, which holds up when two bindings share one.
	let pointerEventsTaken = false

	function forgetPress() {
		clearTimeout(timer)
		press = null
		givePointerEventsBack()

		if (held) {
			held = false
			document.documentElement.classList.remove(...HELD_CLASSES)
		}
	}

	function onPointerDown(event: PointerEvent) {
		if (
			!isHoldPointer(event) ||
			!event.isPrimary ||
			event.button !== 0 ||
			event.defaultPrevented ||
			isExcludedControl(event.target) ||
			isInsideSelection(event.clientX, event.clientY)
		) {
			return
		}

		press = event
		timer = setTimeout(() => {
			if (handlers.onHold(event)) {
				held = true
				document.documentElement.classList.add(...HELD_CLASSES)
				pointerEventsTaken = true
				element.style.pointerEvents = "none"
			}
		}, LONG_PRESS_DELAY)
	}

	function givePointerEventsBack() {
		if (!pointerEventsTaken) {
			return
		}

		element.style.pointerEvents = ""
		pointerEventsTaken = false
	}

	// a held finger keeps its hold when another finger lands. Any other new
	// touch cancels a pending hold and ends the release window, so the next
	// deliberate tap on the opened menu goes through.
	function onAnyPointerDown() {
		if (held) {
			return
		}

		forgetPress()
		releaseUntil = 0
	}

	function onPointerMove(event: PointerEvent) {
		if (press?.pointerId !== event.pointerId) {
			return
		}

		const movedOff =
			Math.hypot(
				event.clientX - press.clientX,
				event.clientY - press.clientY,
			) >= MOVE_THRESHOLD

		if (held) {
			// the held finger belongs to the hold, so what lies under it, such
			// as a chart and its tooltip, does not follow it
			event.stopPropagation()

			if (movedOff) {
				givePointerEventsBack()
			}

			handlers.onHoldMove?.(event)
			return
		}

		if (movedOff) {
			forgetPress()
		}
	}

	function onTouchMove(event: TouchEvent) {
		if (held) {
			event.preventDefault()
			event.stopPropagation()
		}
	}

	// a scroll or a lost window ends the wait, but not a hold already shown
	function cancelPending() {
		if (!held) {
			forgetPress()
		}
	}

	function onPointerEnd(event: PointerEvent) {
		if (press?.pointerId !== event.pointerId) {
			return
		}

		const wasHeld = held
		forgetPress()

		if (!wasHeld) {
			return
		}

		// native long press handling can cancel the pointer before its
		// context menu arrives, so a cancel opens the window as well
		releaseUntil = Date.now() + RELEASE_CLICK_DELAY
		handlers.onHoldEnd?.(event)

		if (event.type === "pointerup") {
			// menu items turn a pointerup into a programmatic click, before
			// the browser emits its own release click
			event.preventDefault()
			event.stopImmediatePropagation()
		}
	}

	function onContextMenu(event: MouseEvent) {
		if (held || Date.now() < releaseUntil) {
			event.preventDefault()
		}
	}

	function onClick(event: MouseEvent) {
		if (event.detail && Date.now() < releaseUntil) {
			releaseUntil = 0
			event.preventDefault()
			event.stopImmediatePropagation()
		}
	}

	// the document listeners run first, since a capture listener on an
	// ancestor fires before one on the element
	document.addEventListener("pointerdown", onAnyPointerDown, options)
	element.addEventListener("pointerdown", onPointerDown, options)
	document.addEventListener("pointermove", onPointerMove, options)
	// only a listener that is there before the touch starts may cancel its
	// scrolling, so this one stays bound and acts only while held
	element.addEventListener("touchmove", onTouchMove, {
		capture: true,
		passive: false,
		signal: controller.signal,
	})
	document.addEventListener("pointerup", onPointerEnd, options)
	document.addEventListener("pointercancel", onPointerEnd, options)
	// a menu can appear under the finger, so the release click may target
	// its portal outside the element that received the touch. Its native
	// context menu can be retargeted there too.
	document.addEventListener("contextmenu", onContextMenu, options)
	document.addEventListener("click", onClick, options)
	window.addEventListener("scroll", cancelPending, options)
	window.addEventListener("blur", cancelPending, { signal: controller.signal })

	return () => {
		forgetPress()
		releaseUntil = 0
		controller.abort()
	}
}

// a pen holds like a finger on a screen that cannot hover, such as an
// iPad's. The handle it would tap elsewhere is hidden there.
function isHoldPointer(event: PointerEvent): boolean {
	return (
		event.pointerType === "touch" ||
		(event.pointerType === "pen" && matchMedia("(hover: none)").matches)
	)
}

function isExcludedControl(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) {
		return false
	}

	const control = target.closest(INTERACTIVE_TARGETS)

	return !!control && !control.closest(HOLD_ALLOWED_TARGETS)
}

// a hold on selected text is left to the platform, which offers copy and
// the selection handles there
function isInsideSelection(x: number, y: number): boolean {
	const selection = document.getSelection()
	if (!selection || selection.isCollapsed) {
		return false
	}

	for (let i = 0; i < selection.rangeCount; i++) {
		for (const rect of selection.getRangeAt(i).getClientRects()) {
			if (
				x >= rect.left &&
				x <= rect.right &&
				y >= rect.top &&
				y <= rect.bottom
			) {
				return true
			}
		}
	}

	return false
}
