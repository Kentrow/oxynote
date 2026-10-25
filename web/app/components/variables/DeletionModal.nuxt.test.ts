import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, it, vi } from "vitest"
import { clearTeleportedOverlays, t, teleportedButton } from "../test-helpers"
import DeletionModal from "./DeletionModal.vue"
import type { DeletionTarget } from "./variables"

// the dialog body is teleported into the shared <body> and the delete flow
// is driven by the global fake timers, so these tests cannot interleave
describe("<DeletionModal>", { concurrent: false }, () => {
	beforeEach(clearTeleportedOverlays)
	afterEach(() => {
		vi.useRealTimers()
	})

	it("stays closed while there is no deletion target", async ({ expect }) => {
		await mountModal(null)

		expect(dialog()).toBeNull()
	})

	it("names the variable and how its references will show", async ({
		expect,
	}) => {
		await mountModal(variableTarget(vi.fn()))

		expect(dialog()?.textContent).toContain(
			t("variable.deletion-modal.variable-title"),
		)
		expect(dialog()?.textContent).toContain("Region")
		expect(dialog()?.textContent).toContain("$region")
	})

	it("deletes the variable when the confirm button is pressed", async ({
		expect,
	}) => {
		vi.useFakeTimers()
		const confirm = vi.fn().mockResolvedValue(undefined)
		const wrapper = await mountModal(variableTarget(confirm))

		teleportedButton(
			t("variable.deletion-modal.variable-confirm-button"),
		).click()
		await vi.advanceTimersByTimeAsync(300)

		expect(confirm).toHaveBeenCalledTimes(1)
		expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([null])
	})

	it("says an empty group can be deleted cleanly and offers to", async ({
		expect,
	}) => {
		await mountModal(groupTarget(0, vi.fn()))

		expect(dialog()?.textContent).toContain(
			t("variable.deletion-modal.group-empty", { name: "Deploys" }),
		)
		expect(
			teleportedButton(t("variable.deletion-modal.group-confirm-button")),
		).toBeDefined()
	})

	it("explains why a group with variables cannot be deleted", async ({
		expect,
	}) => {
		await mountModal(groupTarget(2, vi.fn()))

		expect(dialog()?.textContent).toContain(
			t("variable.deletion-modal.group-blocked", { name: "Deploys", count: 2 }),
		)
		expect(dialogButtons()).toEqual([
			t("variable.deletion-modal.cancel-button"),
		])
	})

	it("closes without deleting when the cancel button is pressed", async ({
		expect,
	}) => {
		const confirm = vi.fn()
		const wrapper = await mountModal(variableTarget(confirm))

		teleportedButton(t("variable.deletion-modal.cancel-button")).click()
		await nextTick()

		expect(confirm).toHaveBeenCalledTimes(0)
		expect(wrapper.emitted("update:modelValue")).toEqual([[null]])
	})
})

function mountModal(modelValue: DeletionTarget | null) {
	return mountSuspended(DeletionModal, { props: { modelValue: modelValue } })
}

function variableTarget(confirm: () => Promise<void>): DeletionTarget {
	return { kind: "variable", name: "Region", reference: "$region", confirm }
}

function groupTarget(
	variableCount: number,
	confirm: () => Promise<void>,
): DeletionTarget {
	return {
		kind: "group",
		name: "Deploys",
		variableCount: variableCount,
		confirm: confirm,
	}
}

// the dialog body is teleported into <body>, so it is the only place the
// modal's own markup can be read from
function dialog() {
	return document.body.querySelector("[data-slot='dialog-content']")
}

function dialogButtons() {
	return Array.from(dialog()?.querySelectorAll("button") ?? []).map((b) =>
		b.textContent.trim(),
	)
}
