import { expect, test } from "@playwright/test"
import {
	contentEditor,
	contentPane,
	createDocument,
	documentPersisted,
	editorText,
	holdBlock,
	openBlockMenu,
	openDocumentActions,
	openSlashMenu,
	readModeToggle,
	sidebarDocument,
	sidebarDocumentRow,
	titleEditor,
	waitForEditor,
} from "../helpers/editor"
import { t } from "../helpers/i18n"
import { visit } from "../helpers/page"
import { signUpWithWorkspace } from "../helpers/workspace"

test.describe("editor", () => {
	test("creates a page and opens it empty", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)

		await createDocument(page)

		await expect
			.poll(() => editorText(titleEditor(page)))
			.toBe(t("editor.new-document-name"))
		await expect(
			contentEditor(page).locator("[data-placeholder]"),
		).toHaveAttribute(
			"data-placeholder",
			t("editor.placeholders.content.paragraph"),
		)
		await expect(page).toHaveTitle(
			t("general.document-page-title", {
				suffix: t("editor.new-document-name"),
			}),
		)
	})

	test("renames a page from its title", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)

		await titleEditor(page).click()
		await page.keyboard.press("ControlOrMeta+A")
		await page.keyboard.type("Release Notes")

		// the name is pushed everywhere it is shown: the URL slug, the
		// sidebar row, the breadcrumb and the tab title
		await expect(page).toHaveURL(/Release-Notes-[a-z0-9]{20}$/)
		await expect(sidebarDocument(page, "Release Notes")).toBeVisible()
		await expect(
			page
				.getByLabel("breadcrumb")
				.getByRole("link", { name: "Release Notes" }),
		).toBeVisible()
		await expect(page).toHaveTitle(
			t("general.document-page-title", { suffix: "Release Notes" }),
		)
	})

	test("switches the page to read mode", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)

		await readModeToggle(page).click()

		await expect(contentEditor(page)).toHaveAttribute(
			"contenteditable",
			"false",
		)
		await expect(titleEditor(page)).toHaveAttribute("contenteditable", "false")
		await expect(readModeToggle(page)).toHaveAccessibleName(
			t("editor.navbar.toggle-read-mode"),
		)
	})

	test("switches the page back to edit mode", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		await readModeToggle(page).click()
		await expect(contentEditor(page)).toHaveAttribute(
			"contenteditable",
			"false",
		)

		await readModeToggle(page).click()

		await expect(contentEditor(page)).toHaveAttribute("contenteditable", "true")
		await expect(titleEditor(page)).toHaveAttribute("contenteditable", "true")
		await expect(readModeToggle(page)).toHaveAccessibleName(
			t("editor.navbar.toggle-edit-mode"),
		)
	})

	test("keeps read mode across a reload", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		const url = page.url()
		await readModeToggle(page).click()
		await expect(contentEditor(page)).toHaveAttribute(
			"contenteditable",
			"false",
		)

		await visit(page, url)

		await waitForEditor(page)
		await expect(contentEditor(page)).toHaveAttribute(
			"contenteditable",
			"false",
		)
	})

	test("keeps content across a reload", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		const url = page.url()

		await contentEditor(page).click()
		await page.keyboard.type("Persist me")
		await documentPersisted(page)

		await visit(page, url)

		await waitForEditor(page)
		await expect.poll(() => editorText(contentEditor(page))).toBe("Persist me")
	})

	test.describe("markdown shortcuts", () => {
		const CASES = [
			{ name: "a heading", typed: "# Title", selector: "h1", text: "Title" },
			{
				name: "a bulleted list",
				typed: "- item",
				selector: "ul > li",
				text: "item",
			},
			{
				name: "a numbered list",
				typed: "1. first",
				selector: "ol > li",
				text: "first",
			},
			{
				name: "bold text",
				typed: "**strong**",
				selector: "strong",
				text: "strong",
			},
			{
				name: "italic text",
				typed: "*slanted*",
				selector: "em",
				text: "slanted",
			},
		]

		for (const c of CASES) {
			test(`turns ${c.typed} into ${c.name}`, async ({ page, request }) => {
				await signUpWithWorkspace(page, request)
				await createDocument(page)

				await contentEditor(page).click()
				await page.keyboard.type(c.typed)

				await expect(contentEditor(page).locator(c.selector)).toHaveText(c.text)
			})
		}
	})

	test("inserts a code block from the slash menu", async ({
		page,
		request,
	}) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)

		await contentEditor(page).click()
		const menu = await openSlashMenu(page)
		await page.keyboard.type("Code")

		// typing narrows the menu down to the one matching command
		await expect(menu.getByRole("button")).toHaveCount(1)
		await expect(menu.getByRole("button")).toContainText("Code Block")

		await page.keyboard.press("Enter")
		await page.keyboard.type("const answer = 42")

		await expect(contentEditor(page).locator("pre code")).toContainText(
			"const answer = 42",
		)
	})

	test("deletes a page after confirming", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		const name = t("editor.new-document-name")

		await openDocumentActions(page, name)
		await page
			.getByRole("menuitem", {
				name: t("sidebar.item-dropdown-menu-buttons.delete-page"),
			})
			.click()

		const dialog = page.getByRole("dialog")
		await expect(dialog).toContainText(
			t("editor.document-deletion-modal.title"),
		)
		await dialog
			.getByRole("button", {
				name: t("editor.document-deletion-modal.confirm-button"),
			})
			.click()

		// the toast comes first, and not only because it is the server's
		// own confirmation that the delete landed: it dismisses itself
		// after a few seconds, so waiting on the sidebar ahead of it
		// leaves this racing a message that may already be gone. The
		// deletion is a request, an invalidation and a tree refetch, so
		// it gets longer than the default to complete.
		await expect(
			page.getByText(
				t("editor.document-deletion-modal.deletion-success", { name }),
			),
		).toBeVisible({ timeout: 15_000 })
		await expect(sidebarDocument(page, name)).toHaveCount(0)
		// the welcome page is the only one left, so that is where the
		// user lands
		await expect(page).toHaveURL(/Welcome-to-Oxynote-[a-z0-9]{20}$/)
	})

	test("keeps the title across a reload", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)

		await titleEditor(page).click()
		await page.keyboard.press("ControlOrMeta+A")
		await page.keyboard.type("Sticky Title")
		await expect(page).toHaveURL(/Sticky-Title-[a-z0-9]{20}$/)
		const url = page.url()
		await documentPersisted(page)

		await visit(page, url)

		await waitForEditor(page)
		await expect.poll(() => editorText(titleEditor(page))).toBe("Sticky Title")
	})

	test("keeps a code block across a reload", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		const url = page.url()

		await contentEditor(page).click()
		const menu = await openSlashMenu(page)
		await page.keyboard.type("Code")
		await expect(menu.getByRole("button")).toHaveCount(1)
		await page.keyboard.press("Enter")
		await page.keyboard.type("const persisted = true")
		await documentPersisted(page)

		await visit(page, url)

		await waitForEditor(page)
		await expect(contentEditor(page).locator("pre code")).toContainText(
			"const persisted = true",
		)
	})

	test("duplicates a page with its content", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		const url = page.url()
		await contentEditor(page).click()
		await page.keyboard.type("Copy me over")
		// the duplicate is built from the stored content, so the text has
		// to reach the server first
		await documentPersisted(page)

		await page
			.getByRole("button", { name: t("editor.navbar.open-document-options") })
			.click()
		await page
			.getByRole("menuitem", {
				name: t("editor.navbar.document-options.duplicate.title"),
			})
			.click()

		// the copy's name is the original's plus a timestamp, and the app
		// navigates straight to it
		await expect(page).not.toHaveURL(url)
		await waitForEditor(page)
		await expect
			.poll(() => editorText(titleEditor(page)))
			.toMatch(/^New Page \(/)
		await expect
			.poll(() => editorText(contentEditor(page)))
			.toBe("Copy me over")
	})

	test("navigates between pages from the sidebar", async ({
		page,
		request,
	}) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		await titleEditor(page).click()
		await page.keyboard.press("ControlOrMeta+A")
		await page.keyboard.type("Second Page")
		await expect(page).toHaveURL(/Second-Page-[a-z0-9]{20}$/)

		await sidebarDocument(page, "Welcome to Oxynote!").click()

		await expect(page).toHaveURL(/Welcome-to-Oxynote-[a-z0-9]{20}$/)
		await waitForEditor(page)
		await expect
			.poll(() => editorText(titleEditor(page)))
			.toBe("Welcome to Oxynote!")

		await sidebarDocument(page, "Second Page").click()

		await expect(page).toHaveURL(/Second-Page-[a-z0-9]{20}$/)
		await waitForEditor(page)
		await expect.poll(() => editorText(titleEditor(page))).toBe("Second Page")
	})

	test("nests a sub page under its parent", async ({ page, request }) => {
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		const parent = t("editor.new-document-name")

		await openDocumentActions(page, parent)
		await page
			.getByRole("menuitem", {
				name: t("sidebar.item-dropdown-menu-buttons.add-sub-page"),
			})
			.click()

		const parentRow = sidebarDocumentRow(page, parent).first()
		await expect(parentRow).toHaveAttribute("data-item-children", "1")

		// the child list is collapsed until the parent is expanded
		await parentRow.hover()
		await parentRow
			.getByRole("button", {
				name: t("sidebar.item-collapse-trigger-button.open-screen-reader-hint"),
			})
			.click()

		const child = parentRow.locator(
			'[data-sidebar="menu-badge"] a[data-sidebar="menu-button"]',
		)
		await expect(child).toHaveText(parent)
		await expect(child).not.toHaveAttribute("data-optimistic-insert", "")
	})

	test("drops the linked block when a block is dragged", async ({
		page,
		request,
	}) => {
		await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		await contentEditor(page).click()
		await page.keyboard.type("First")
		await page.keyboard.press("Enter")
		await page.keyboard.type("Second")
		const first = contentEditor(page).getByText("First", { exact: true })
		const second = contentEditor(page).getByText("Second", { exact: true })
		await openBlockMenu(page, contentPane(page), second)
		await page
			.getByRole("menuitem", {
				name: t("editor.drag-handle.options.copy-link"),
			})
			.click()
		await expect
			.poll(() => page.evaluate(() => navigator.clipboard.readText()), {
				message: "the block link reaches the clipboard",
			})
			.toContain("#")
		const link = new URL(
			await page.evaluate(() => navigator.clipboard.readText()),
		)
		await documentPersisted(page)
		await visit(page, link.href)
		const highlight = page.locator(".editor-scroll-highlight")
		await expect(highlight).toBeVisible({ timeout: 15_000 })

		const target = await second.boundingBox()
		expect(target).not.toBeNull()

		await first.hover()
		await contentPane(page)
			.locator('.z-drag-handle [data-slot="dropdown-menu-trigger"]', {
				has: page.locator('[class*="dots-line"]'),
			})
			.hover()
		await page.mouse.down()
		await page.mouse.move(
			(target?.x ?? 0) + 20,
			(target?.y ?? 0) + (target?.height ?? 0) - 2,
			{ steps: 10 },
		)
		await page.mouse.up()

		await expect.poll(() => editorText(contentEditor(page))).toBe("SecondFirst")
		await expect(page).toHaveURL(link.href.replace(link.hash, ""))
		await expect(highlight).toHaveCount(0)
	})

	test("drops the linked block when the document is typed in", async ({
		page,
		request,
	}) => {
		await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
		await signUpWithWorkspace(page, request)
		await createDocument(page)
		await contentEditor(page).click()
		await page.keyboard.type("Linked")
		const block = contentEditor(page).getByText("Linked", { exact: true })
		await openBlockMenu(page, contentPane(page), block)
		await page
			.getByRole("menuitem", {
				name: t("editor.drag-handle.options.copy-link"),
			})
			.click()
		await expect
			.poll(() => page.evaluate(() => navigator.clipboard.readText()), {
				message: "the block link reaches the clipboard",
			})
			.toContain("#")
		const link = new URL(
			await page.evaluate(() => navigator.clipboard.readText()),
		)
		await documentPersisted(page)
		await visit(page, link.href)
		const highlight = page.locator(".editor-scroll-highlight")
		await expect(highlight).toBeVisible({ timeout: 15_000 })

		// a click would drop the linked block by itself
		await contentEditor(page).focus()
		await page.keyboard.type("!")

		await expect(page).toHaveURL(link.href.replace(link.hash, ""))
		await expect(highlight).toHaveCount(0)
	})

	test.describe("on a touch screen", () => {
		// the sidebar that creates a page folds away on a phone, so each test
		// sets its page up at the default size and then narrows to a phone
		const PHONE = { width: 390, height: 844 }

		test.use({ hasTouch: true, isMobile: true })

		test("opens a block's menu once a hold is released, without showing the handle", async ({
			page,
			request,
		}) => {
			await signUpWithWorkspace(page, request)
			await createDocument(page)
			await page.setViewportSize(PHONE)
			await contentEditor(page).tap()
			await page.keyboard.type("Held")
			const block = contentEditor(page).getByText("Held", { exact: true })

			const finger = await holdBlock(page, block)
			await expect(page.getByRole("menu")).toHaveCount(0)
			await finger.lift()

			// the release opens the menu, and picks none of its items even
			// where the menu opens under the finger
			await expect(page.getByRole("menu")).toBeVisible()
			await expect(
				page.getByRole("menuitem", {
					name: t("editor.drag-handle.options.copy-link"),
				}),
			).toBeVisible()
			await expect(
				contentPane(page).locator(".z-drag-handle:not([inert])"),
			).toHaveCSS("opacity", "0")
			await expect.poll(() => editorText(contentEditor(page))).toBe("Held")
		})

		test("moves a block by holding it and dragging it below the next one", async ({
			page,
			request,
		}) => {
			await signUpWithWorkspace(page, request)
			await createDocument(page)
			await page.setViewportSize(PHONE)
			await contentEditor(page).tap()
			await page.keyboard.type("First")
			await page.keyboard.press("Enter")
			await page.keyboard.type("Second")
			const first = contentEditor(page).getByText("First", { exact: true })
			const second = contentEditor(page).getByText("Second", { exact: true })
			const held = await first.boundingBox()
			const target = await second.boundingBox()
			expect(held).not.toBeNull()
			expect(target).not.toBeNull()
			const finger = await holdBlock(page, first)

			// straight down from where the finger holds the block, since how
			// far left a drag goes picks the level it drops into
			await finger.move(
				(held?.x ?? 0) + (held?.width ?? 0) / 2,
				(target?.y ?? 0) + (target?.height ?? 0) - 2,
			)
			await finger.lift()

			await expect
				.poll(() => editorText(contentEditor(page)))
				.toBe("SecondFirst")
			await expect(page.getByRole("menu")).toHaveCount(0)
			// the hold kept pointer events from the editor, and it takes the next
			// touch again once the drag is over
			await expect(contentEditor(page)).toHaveCSS("pointer-events", "auto")
		})
	})
})
