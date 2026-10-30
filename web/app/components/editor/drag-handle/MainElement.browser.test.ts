import { Editor } from "@tiptap/vue-3"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import { PluginKey } from "@tiptap/pm/state"
import { mount, type VueWrapper } from "@vue/test-utils"
import { afterEach, describe, it, vi } from "vitest"
import { h } from "vue"
import { DragHandle } from "./MainElement"
import { touchPointer } from "~/components/editor/test-helpers"

const cleanups: (() => void)[] = []

function makeEditor(): Editor {
	const container = document.createElement("div")
	document.body.appendChild(container)

	const editor = new Editor({
		element: container,
		injectCSS: false,
		extensions: [Document, Paragraph, Text],
		content: "<p>hello</p>",
	})

	cleanups.push(() => {
		editor.destroy()
		container.remove()
	})

	return editor
}

type HandleProps = InstanceType<typeof DragHandle>["$props"]

function mountHandle(props: HandleProps): VueWrapper {
	const wrapper = mount(DragHandle, {
		props,
		// a render function, not a template string: vue-test-utils compiles
		// string slots at runtime through its own bundled compiler, which
		// warns about decodeEntities whenever vite serves that compiler
		// unoptimized
		slots: { default: () => h("span", "drag") },
		attachTo: document.body,
	})

	cleanups.push(() => {
		wrapper.unmount()
	})

	return wrapper
}

// every case drives a real editor attached to the shared page, and the
// plugin appends its own overlay to the document
describe("DragHandle", { concurrent: false }, () => {
	afterEach(() => {
		for (const cleanup of cleanups.splice(0)) {
			cleanup()
		}
	})

	it("renders a div with the default class around the slot content", ({
		expect,
	}) => {
		const wrapper = mountHandle({ editor: makeEditor() })

		expect((wrapper.element as HTMLElement).tagName).toBe("DIV")
		expect(wrapper.classes()).toContain("drag-handle")
		expect(wrapper.html()).toContain("<span>drag</span>")
	})

	it("renders the class given by the class prop", ({ expect }) => {
		const wrapper = mountHandle({
			editor: makeEditor(),
			class: "custom-handle",
		})

		expect(wrapper.classes()).toEqual(["custom-handle"])
	})

	it("registers the drag handle plugin against its own rendered element", ({
		expect,
	}) => {
		const editor = makeEditor()
		const pluginKey = new PluginKey("handleUnderTest")
		const wrapper = mountHandle({ editor, pluginKey })

		// the plugin's view hook only reaches these properties if the
		// component handed it the element it rendered
		expect(pluginKey.getState(editor.state)).toBeDefined()
		expect((wrapper.element as HTMLElement).draggable).toBe(true)
		expect((wrapper.element as HTMLElement).style.pointerEvents).toBe("auto")
	})

	it("registers a plugin for a plugin key given as a string", ({ expect }) => {
		const editor = makeEditor()
		const before = editor.state.plugins.length

		mountHandle({ editor, pluginKey: "stringHandleKey" })

		expect(editor.state.plugins).toHaveLength(before + 1)
	})

	it("unregisters the plugin when the component is unmounted", ({ expect }) => {
		const editor = makeEditor()
		const pluginKey = new PluginKey("unmountedHandle")
		const before = editor.state.plugins.length
		const wrapper = mountHandle({ editor, pluginKey })

		wrapper.unmount()

		expect(pluginKey.getState(editor.state)).toBeUndefined()
		expect(editor.state.plugins).toHaveLength(before)
	})

	it("locks the handle when the locked prop turns on", async ({ expect }) => {
		const editor = makeEditor()
		const wrapper = mountHandle({ editor })
		const element = wrapper.element as HTMLElement

		expect(element.draggable).toBe(true)

		await wrapper.setProps({ locked: true })

		// the watcher sends the lock through the editor, and the plugin's
		// view reacts to that transaction by pinning the handle
		expect(element.draggable).toBe(false)
	})

	it("unlocks the handle when the locked prop turns off", async ({
		expect,
	}) => {
		const editor = makeEditor()
		const wrapper = mountHandle({ editor, locked: true })
		const element = wrapper.element as HTMLElement

		await wrapper.setProps({ locked: false })

		expect(element.draggable).toBe(true)
	})

	it("starts locked when the locked prop is set from the beginning", ({
		expect,
	}) => {
		const editor = makeEditor()
		const wrapper = mountHandle({ editor, locked: true })
		const element = wrapper.element as HTMLElement

		editor.commands.insertContent("x")

		expect(element.draggable).toBe(false)
	})

	it("reports a touch hold on a block without a mouse hover", async ({
		expect,
	}) => {
		const editor = makeEditor()
		const onNodeHold = vi.fn()
		const onNodeChange = vi.fn()
		const wrapper = mountHandle({
			editor,
			onNodeHold,
			onNodeLongPress: vi.fn(),
			onNodeChange,
		})
		vi.useFakeTimers()

		try {
			await holdParagraph(editor)

			expect.soft(onNodeHold).toHaveBeenCalledTimes(1)
			expect.soft(onNodeChange).toHaveBeenCalledWith(
				expect.objectContaining({
					pos: 0,
					node: editor.state.doc.firstChild,
				}),
			)
			expect.soft((wrapper.element as HTMLElement).style.visibility).toBe("")
			expect.soft(editor.view.dragging).toBeNull()
		} finally {
			vi.useRealTimers()
		}
	})

	it.for([
		{
			name: "opens the menu when the held finger lifts",
			input: "pointerup",
			expected: { menus: 1, holdEnds: 0 },
		},
		{
			name: "ends a hold without a menu when the touch is cancelled",
			input: "pointercancel",
			expected: { menus: 0, holdEnds: 1 },
		},
	])("$name", async ({ input, expected }, { expect }) => {
		const editor = makeEditor()
		const onNodeLongPress = vi.fn()
		const onNodeHoldEnd = vi.fn()
		mountHandle({ editor, onNodeHold: vi.fn(), onNodeLongPress, onNodeHoldEnd })
		vi.useFakeTimers()

		try {
			await holdParagraph(editor)

			document.dispatchEvent(touchPointer(input, 0, 0))
			await vi.advanceTimersByTimeAsync(0)

			expect.soft(onNodeLongPress).toHaveBeenCalledTimes(expected.menus)
			expect.soft(onNodeHoldEnd).toHaveBeenCalledTimes(expected.holdEnds)
		} finally {
			vi.useRealTimers()
		}
	})

	it("forwards the node change callback to the plugin", ({ expect }) => {
		const editor = makeEditor()
		const onNodeChange = vi.fn()

		mountHandle({ editor, onNodeChange })
		editor.view.focus()
		editor.view.dom.dispatchEvent(
			new KeyboardEvent("keydown", { key: "a", bubbles: true }),
		)

		expect(onNodeChange).toHaveBeenCalledWith({
			editor,
			node: null,
			pos: -1,
			depth: 0,
		})
	})
})

// rests a finger on the editor's paragraph for as long as a hold takes
async function holdParagraph(editor: Editor) {
	const paragraph = editor.view.dom.querySelector("p")
	if (!paragraph) {
		throw new Error("the test needs a paragraph")
	}

	const rect = paragraph.getBoundingClientRect()
	paragraph.dispatchEvent(
		touchPointer("pointerdown", rect.left + 5, rect.top + rect.height / 2),
	)
	await vi.advanceTimersByTimeAsync(300)
}
