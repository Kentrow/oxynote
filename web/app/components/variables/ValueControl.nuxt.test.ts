import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, it, vi } from "vitest"
import { toast } from "vue-sonner"
import type { VariableTreeElement } from "~/utils"
import {
	clearQueryCache,
	disposeMockEndpoints,
	mockEndpoint,
} from "~/composables/api/test-helpers"
import { Select, SelectValue } from "#layers/ui/app/components/shadcn/ui/select"
import { emitFrom, raisedToasts, settleMutations, t } from "../test-helpers"
import TimeRangeSelect from "./TimeRangeSelect.vue"
import ValueControl from "./ValueControl.vue"
import {
	GROUP_DEPLOYS,
	OPTION_EU,
	OPTION_US,
	VAR_RANGE,
	VAR_REFRESH,
	VAR_REGION,
	environmentGroup,
	fullTree,
	makeGroup,
	makeVariable,
	metricsGroup,
	mockTree,
} from "./test-helpers"

vi.mock("vue-sonner", () => ({
	toast: { custom: vi.fn(), dismiss: vi.fn() },
}))

const VALUE_URL = (id: string) => `/api/variables/${id}/value`

// every save goes through the app-wide query cache and the module-mocked
// toast, so the tests cannot interleave
describe("<ValueControl>", { concurrent: false }, () => {
	beforeEach(() => {
		clearQueryCache()
		vi.mocked(toast.custom).mockClear()
	})
	afterEach(disposeMockEndpoints)

	describe("when the variable is a list", () => {
		it("offers the options in a select with the default as placeholder", async ({
			expect,
		}) => {
			const wrapper = await mountControl(regionVariable({ value: null }))

			expect(wrapper.findComponent(Select).props("modelValue")).toBeUndefined()
			expect(wrapper.findComponent(SelectValue).props("placeholder")).toBe(
				"eu-west-1",
			)
			expect(wrapper.find("input").exists()).toBe(false)
			expect(wrapper.find("textarea").exists()).toBe(false)
		})

		it("saves the option the user picks", async ({ expect }) => {
			mockTree(fullTree())
			const calls = mockEndpoint("PUT", VALUE_URL(VAR_REGION), () => null)
			const wrapper = await mountControl(regionVariable({ value: null }))

			emitFrom(wrapper, Select, "update:modelValue", OPTION_US)
			await settleMutations()

			expect
				.soft(calls.map((call) => call.body))
				.toEqual([{ value: OPTION_US }])
			expect.soft(raisedToasts()).toEqual([])
		})
	})

	describe("when the variable is a time range", () => {
		it("offers the time range presets with the default as placeholder", async ({
			expect,
		}) => {
			const wrapper = await mountControl(rangeVariable())

			expect(wrapper.findComponent(TimeRangeSelect).exists()).toBe(true)
			expect(wrapper.findComponent(SelectValue).props("placeholder")).toBe(
				t("general.time-range-options.last_24_hours"),
			)
		})

		it("saves the preset the user picks", async ({ expect }) => {
			mockTree(fullTree())
			const calls = mockEndpoint("PUT", VALUE_URL(VAR_RANGE), () => null)
			const wrapper = await mountControl(rangeVariable())

			emitFrom(wrapper, Select, "update:modelValue", "last_7_days")
			await settleMutations()

			expect
				.soft(calls.map((call) => call.body))
				.toEqual([{ value: "last_7_days" }])
		})
	})

	it("names the built-in refresh options like the metric charts do", async ({
		expect,
	}) => {
		const refresh = metricsGroup().variables.find((v) => v.id === VAR_REFRESH)
		const wrapper = await mountControl({ ...makeVariable({}), ...refresh })

		expect(wrapper.findComponent(SelectValue).props("placeholder")).toBe(
			t("general.refresh-interval-options.5m"),
		)
	})

	it("knows every preset the metric charts offer", async ({ expect }) => {
		const wrapper = await mountControl({
			...rangeVariable(),
			defaultValue: "previous_month",
		})

		expect(wrapper.findComponent(SelectValue).props("placeholder")).toBe(
			t("general.time-range-options.previous_month"),
		)
	})

	describe("when the variable is a number", () => {
		it("offers a number field with the default as placeholder", async ({
			expect,
		}) => {
			const wrapper = await mountControl(numberVariable({ value: null }))

			expect(wrapper.get("input").attributes("placeholder")).toBe("2")
			expect(wrapper.get("input").element.value).toBe("")
			expect(wrapper.findComponent(Select).exists()).toBe(false)
		})

		it("saves the number once the field loses focus", async ({ expect }) => {
			const variable = numberVariable({ value: null })
			mockTree(treeHolding(variable))
			const calls = mockEndpoint("PUT", VALUE_URL(variable.id), () => null)
			const wrapper = await mountControl(variable)

			await wrapper.get("input").setValue("3.5")
			await wrapper.get("input").trigger("blur")
			await settleMutations()

			expect.soft(calls.map((call) => call.body)).toEqual([{ value: "3.5" }])
		})

		it("saves the number once the user pauses typing", async ({ expect }) => {
			const variable = numberVariable({ value: null })
			mockTree(treeHolding(variable))
			const calls = mockEndpoint("PUT", VALUE_URL(variable.id), () => null)
			const wrapper = await mountControl(variable)

			await wrapper.get("input").setValue("3")
			await wrapper.get("input").setValue("35")

			expect.soft(calls).toHaveLength(0)

			await vi.waitFor(() => {
				expect(calls).toHaveLength(1)
			})

			expect.soft(calls.map((call) => call.body)).toEqual([{ value: "35" }])
		})

		it("drops the pending save once the field loses focus", async ({
			expect,
		}) => {
			const variable = numberVariable({ value: null })
			mockTree(treeHolding(variable))
			const calls = mockEndpoint("PUT", VALUE_URL(variable.id), () => null)
			const wrapper = await mountControl(variable)

			await wrapper.get("input").setValue("4")
			await wrapper.get("input").trigger("blur")
			await new Promise((resolve) => setTimeout(resolve, 600))
			await settleMutations()

			expect.soft(calls.map((call) => call.body)).toEqual([{ value: "4" }])
		})

		it("falls back to the default once the field is cleared", async ({
			expect,
		}) => {
			const variable = numberVariable({ value: "7" })
			mockTree(treeHolding(variable))
			const resets = mockEndpoint("DELETE", VALUE_URL(variable.id), () => null)
			const sets = mockEndpoint("PUT", VALUE_URL(variable.id), () => null)
			const wrapper = await mountControl(variable)

			await wrapper.get("input").setValue("")
			await wrapper.get("input").trigger("blur")
			await settleMutations()

			expect.soft(resets).toHaveLength(1)
			expect.soft(sets).toHaveLength(0)
		})

		it("sends nothing when the number did not change", async ({ expect }) => {
			const variable = numberVariable({ value: "7" })
			const sets = mockEndpoint("PUT", VALUE_URL(variable.id), () => null)
			const resets = mockEndpoint("DELETE", VALUE_URL(variable.id), () => null)
			const wrapper = await mountControl(variable)

			await wrapper.get("input").trigger("blur")
			await settleMutations()

			expect.soft(sets).toHaveLength(0)
			expect.soft(resets).toHaveLength(0)
		})
	})

	describe("when the variable is text", () => {
		it("offers a text area with the default as placeholder", async ({
			expect,
		}) => {
			const wrapper = await mountControl(textVariable())

			expect(wrapper.get("textarea").attributes("placeholder")).toBe(
				"relay-2.14.0",
			)
			expect(wrapper.find("input").exists()).toBe(false)
		})

		it("saves the text once the field loses focus", async ({ expect }) => {
			const variable = textVariable()
			mockTree(treeHolding(variable))
			const calls = mockEndpoint("PUT", VALUE_URL(variable.id), () => null)
			const wrapper = await mountControl(variable)

			await wrapper.get("textarea").setValue("relay-2.15.0")
			await wrapper.get("textarea").trigger("blur")
			await settleMutations()

			expect
				.soft(calls.map((call) => call.body))
				.toEqual([{ value: "relay-2.15.0" }])
		})

		it("saves the text once the user pauses typing", async ({ expect }) => {
			const variable = textVariable()
			mockTree(treeHolding(variable))
			const calls = mockEndpoint("PUT", VALUE_URL(variable.id), () => null)
			const wrapper = await mountControl(variable)

			await wrapper.get("textarea").setValue("relay-2.16.0")

			expect.soft(calls).toHaveLength(0)

			await vi.waitFor(() => {
				expect(calls).toHaveLength(1)
			})

			expect
				.soft(calls.map((call) => call.body))
				.toEqual([{ value: "relay-2.16.0" }])
		})
	})

	it("shows the key the queries reference beside the name", async ({
		expect,
	}) => {
		const wrapper = await mountControl(textVariable())

		expect(wrapper.text()).toContain("Release")
		expect(wrapper.text()).toContain("($release)")
	})

	it("offers no reset while the user sees the default", async ({ expect }) => {
		const wrapper = await mountControl(regionVariable({ value: OPTION_EU }))

		expect(wrapper.text()).not.toContain(t("variable.actions.reset"))
	})

	it("resets a value that strays from the default", async ({ expect }) => {
		mockTree(fullTree())
		const calls = mockEndpoint("DELETE", VALUE_URL(VAR_REGION), () => null)
		const wrapper = await mountControl(regionVariable({ value: OPTION_US }))

		await wrapper.get("button").trigger("click")
		await settleMutations()

		expect(wrapper.get("button").text()).toBe(t("variable.actions.reset"))
		expect.soft(calls).toHaveLength(1)
		expect.soft(raisedToasts()).toEqual([])
	})

	it("raises a toast when the value cannot be saved", async ({ expect }) => {
		mockTree(fullTree())
		const calls = mockEndpoint("PUT", VALUE_URL(VAR_REGION), () => {
			throw createError({ statusCode: 500 })
		})
		const wrapper = await mountControl(regionVariable({ value: null }))

		emitFrom(wrapper, Select, "update:modelValue", OPTION_US)
		await settleMutations()

		expect.soft(calls).toHaveLength(1)
		expect.soft(raisedToasts()).toEqual([
			expect.objectContaining({
				type: "error",
				title: t("variable.errors.value-failed"),
			}),
		])
	})

	it("raises a toast when the value cannot be reset", async ({ expect }) => {
		mockTree(fullTree())
		const calls = mockEndpoint("DELETE", VALUE_URL(VAR_REGION), () => {
			throw createError({ statusCode: 500 })
		})
		const wrapper = await mountControl(regionVariable({ value: OPTION_US }))

		await wrapper.get("button").trigger("click")
		await settleMutations()

		expect.soft(calls).toHaveLength(1)
		expect.soft(raisedToasts()).toEqual([
			expect.objectContaining({
				type: "error",
				title: t("variable.errors.value-failed"),
			}),
		])
	})
})

function treeHolding(variable: VariableTreeElement) {
	return [
		...fullTree().filter((group) => group.id !== variable.groupId),
		makeGroup({ id: variable.groupId }, [variable]),
	]
}

function mountControl(variable: VariableTreeElement) {
	return mountSuspended(ValueControl, { props: { variable: variable } })
}

function regionVariable(overrides: Partial<VariableTreeElement>) {
	const region = environmentGroup().variables.find((v) => v.id === VAR_REGION)

	return { ...makeVariable({}), ...region, ...overrides }
}

function rangeVariable() {
	const range = metricsGroup().variables.find((v) => v.id === VAR_RANGE)

	return { ...makeVariable({}), ...range }
}

function numberVariable(overrides: Partial<VariableTreeElement>) {
	return makeVariable({
		groupId: GROUP_DEPLOYS,
		key: "hotfix_max",
		name: "Hotfix threshold",
		type: "number",
		defaultValue: "2",
		...overrides,
	})
}

function textVariable() {
	return makeVariable({
		groupId: GROUP_DEPLOYS,
		key: "release",
		name: "Release",
		type: "text",
		defaultValue: "relay-2.14.0",
	})
}
