import { mountSuspended } from "@nuxt/test-utils/runtime"
import type { VueWrapper } from "@vue/test-utils"
import { describe, it } from "vitest"
import { emitFromNth, findButtonByText, t } from "../test-helpers"
import DraggableRow from "./DraggableRow.vue"
import OptionsField from "./OptionsField.vue"
import type { OptionDraft } from "./variables"

// the drag store behind every row is one app-wide pinia store
describe("<OptionsField>", { concurrent: false }, () => {
	it("marks the first option as the default", async ({ expect }) => {
		const wrapper = await mountField(drafts("eu", "us"))

		const rows = wrapper.findAllComponents(DraggableRow)

		expect(rows[0]?.text()).toContain(
			t("variable.variable-form.option-default"),
		)
		expect(rows[1]?.text()).not.toContain(
			t("variable.variable-form.option-default"),
		)
	})

	it("keeps an option from being dropped where it already is", async ({
		expect,
	}) => {
		const wrapper = await mountField(drafts("eu", "us"))

		const previous = wrapper
			.findAllComponents(DraggableRow)
			.map((row) => row.props("previousId") as string | null)

		// each row refuses the option right before it; the add row ends the list
		expect(previous).toEqual([null, "eu", "us"])
	})

	it("adds the typed option on enter", async ({ expect }) => {
		const wrapper = await mountField(drafts("eu"))

		await addInput(wrapper).setValue(" us ")
		await addInput(wrapper).trigger("keydown", { key: "Enter" })

		expect(lastModel(wrapper).map((o) => o.value)).toEqual(["eu", "us"])
		expect(lastModel(wrapper).at(-1)).toMatchObject({ existing: false })
		expect((addInput(wrapper).element as HTMLInputElement).value).toBe("")
	})

	it.for([
		{ name: "ignores a blank option", input: "  " },
		{ name: "ignores an option already listed", input: "eu" },
	])("$name", async ({ input }, { expect }) => {
		const wrapper = await mountField(drafts("eu"))

		await addInput(wrapper).setValue(input)
		await addInput(wrapper).trigger("blur")

		expect(wrapper.emitted("update:modelValue")).toBeUndefined()
	})

	it("removes an option", async ({ expect }) => {
		const wrapper = await mountField(drafts("eu", "us"))

		await findButtonByText(
			wrapper,
			t("variable.variable-form.remove-option", { value: "eu" }),
		).trigger("click")

		expect(lastModel(wrapper).map((o) => o.value)).toEqual(["us"])
	})

	it.for([
		{
			name: "moves an option before the one it is dropped on",
			input: { from: 2, insertBeforeId: "eu" },
			expected: ["ap", "eu", "us"],
		},
		{
			name: "moves an option to the end when dropped on the add row",
			input: { from: 0, insertBeforeId: null },
			expected: ["us", "ap", "eu"],
		},
	])("$name", async ({ input, expected }, { expect }) => {
		const wrapper = await mountField(drafts("eu", "us", "ap"))

		emitFromNth(wrapper, DraggableRow, input.from, "move", {
			parentId: null,
			insertBeforeId: input.insertBeforeId,
		})

		expect(lastModel(wrapper).map((o) => o.value)).toEqual(expected)
	})
})

function mountField(options: OptionDraft[]) {
	return mountSuspended(OptionsField, {
		props: { modelValue: options, labelId: "options-label" },
	})
}

function drafts(...values: string[]): OptionDraft[] {
	return values.map((value) => ({ id: value, existing: true, value: value }))
}

function addInput(wrapper: VueWrapper) {
	return wrapper.get(
		`input[placeholder="${t("variable.variable-form.add-option")}"]`,
	)
}

function lastModel(wrapper: VueWrapper): OptionDraft[] {
	const emitted = wrapper.emitted("update:modelValue")?.at(-1)?.[0]
	if (!emitted) {
		throw new Error("the options were never updated")
	}

	return emitted as OptionDraft[]
}
