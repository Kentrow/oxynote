import { beforeEach, describe, it } from "vitest"
import ExtraContextSidebar from "./ExtraContextSidebar.vue"
import {
	emitFrom,
	mountUnderSidebarProvider,
	seedPersistentState,
	stubViewportMatches,
} from "./test-helpers"

// the viewport stub and the sidebar's persisted open state are shared by
// every mount in the file
describe("<ExtraContextSidebar>", { concurrent: false }, () => {
	beforeEach(() => {
		seedPersistentState("sidebar-state", true)
	})

	it("collapses the column and slides the panel behind the sidebar while closed", async ({
		expect,
	}) => {
		stubViewportMatches(false)

		const wrapper = await mountPanel(false)

		expect(wrapper.html()).toContain("grid-cols-[0rem]")
		expect(positioned(wrapper).className).toContain("-translate-x-full")
		expect(positioned(wrapper).getAttribute("style")).toContain("left: 232px")
	})

	it("opens the column beside the sidebar when the panel is open", async ({
		expect,
	}) => {
		stubViewportMatches(false)

		const wrapper = await mountPanel(true)

		expect(wrapper.html()).toContain("grid-cols-[clamp(20rem,22dvw,26.25rem)]")
		expect(positioned(wrapper).className).toContain("translate-x-0")
		expect(positioned(wrapper).getAttribute("style")).toContain("left: 232px")
	})

	it("keeps the panel against the left edge while the sidebar is collapsed", async ({
		expect,
	}) => {
		stubViewportMatches(false)
		seedPersistentState("sidebar-state", false)

		const wrapper = await mountPanel(true)

		expect(positioned(wrapper).getAttribute("style")).toContain("left: 0px")
	})

	it("keeps its content mounted on wide viewports while closed", async ({
		expect,
	}) => {
		stubViewportMatches(false)

		const wrapper = await mountPanel(false)

		expect(wrapper.find("[data-content]").exists()).toBe(true)
	})

	it("leaves the sheet closed on narrow viewports while the panel is closed", async ({
		expect,
	}) => {
		stubViewportMatches(true)

		await mountPanel(false)

		expect(
			document.body.querySelector("[data-slot='sheet-content']"),
		).toBeNull()
	})

	it("opens a sheet titled for its content on narrow viewports", async ({
		expect,
	}) => {
		stubViewportMatches(true)

		await mountPanel(true)

		const sheet = document.body.querySelector("[data-slot='sheet-content']")
		expect(sheet?.textContent).toContain("Panel title")
		expect(sheet?.textContent).toContain("Panel description")
		expect(sheet?.querySelector("[data-content]")).not.toBeNull()
	})

	it("closes when the sheet is dismissed", async ({ expect }) => {
		stubViewportMatches(true)
		const wrapper = await mountPanel(true)

		emitFrom(wrapper, "Sheet", "update:open", false)
		await nextTick()

		expect(
			wrapper.findComponent(ExtraContextSidebar).emitted("update:modelValue"),
		).toEqual([[false]])
	})

	it.for([
		{ name: "on narrow viewports", input: true },
		{ name: "on wide viewports", input: false },
	])(
		"closes when its content asks to be closed $name",
		async ({ input }, { expect }) => {
			stubViewportMatches(input)
			const wrapper = await mountPanel(true)

			// a sheet from an earlier test can still sit in <body>, so the
			// newest one is this mount's
			const content = input
				? Array.from(
						document.body.querySelectorAll<HTMLButtonElement>("[data-content]"),
					).at(-1)
				: (wrapper.get("[data-content]").element as HTMLButtonElement)
			content?.click()
			await nextTick()

			expect(
				wrapper.findComponent(ExtraContextSidebar).emitted("update:modelValue"),
			).toEqual([[false]])
		},
	)
})

function mountPanel(open: boolean) {
	return mountUnderSidebarProvider(ExtraContextSidebar, {
		props: {
			modelValue: open,
			title: "Panel title",
			description: "Panel description",
		},
		slots: {
			default: ({ close }: { close: () => void }) =>
				h("button", { "data-content": "", onClick: close }),
		},
	})
}

// the box that slides is the one holding the content
function positioned(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
	const element =
		wrapper.get("[data-content]").element.parentElement?.parentElement
	if (!element) {
		throw new Error("the content is not inside a positioned box")
	}

	return element
}
