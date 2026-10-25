import { common, createLowlight } from "lowlight"
import { describe, it } from "vitest"
import {
	defaultExtendedCodeBlockLanguage,
	extendedCodeBlockLanguageOptions,
	extendedCodeBlockLanguages,
} from "./languages"

describe("extendedCodeBlockLanguages", () => {
	it("adds curl to lowlight's common grammar set", ({ expect }) => {
		expect(extendedCodeBlockLanguages.curl).toBeTypeOf("function")
		expect(extendedCodeBlockLanguages.javascript).toBeTypeOf("function")
		expect(extendedCodeBlockLanguages.yaml).toBeTypeOf("function")
	})

	it("leaves lowlight's shared common record untouched", ({ expect }) => {
		expect(common).not.toBe(extendedCodeBlockLanguages)
		expect(common.curl).toBeUndefined()
	})
})

describe("function calls", () => {
	const extended = createLowlight(extendedCodeBlockLanguages)
	const stock = createLowlight(common)

	it.for([
		{ key: "csharp", code: "Console.WriteLine(Foo(1));" },
		{ key: "go", code: "fmt.Println(foo(1))" },
		{ key: "java", code: "System.out.println(foo(1));" },
		{ key: "kotlin", code: "a.println(foo(1))" },
		{ key: "python", code: "os.path.join(foo(1))" },
		{ key: "ruby", code: "a.puts(foo(1))" },
		{ key: "swift", code: "a.write(foo(1))" },
	])("marks $key calls, nested ones included", ({ key, code }, { expect }) => {
		expect(callNames(extended.highlight(key, code))).toHaveLength(2)
		expect(callNames(stock.highlight(key, code))).toEqual([])
	})

	it.for([
		{ name: "a keyword before a parenthesis", code: "if (a) { }" },
		{ name: "a type conversion", code: "x := string(a)" },
		{ name: "a built-in", code: "n := len(a)" },
		{ name: "a comment", code: "// foo(1)" },
		{ name: "a string", code: 's := "foo(1)"' },
	])("leaves $name alone", ({ code }, { expect }) => {
		expect(callNames(extended.highlight("go", code))).toEqual([])
	})

	it.for([
		{ key: "python", code: "def run(a=make(1)): pass", expected: ["make"] },
		{ key: "swift", code: 'let s = "\\(fmt(a))"', expected: ["fmt"] },
	])(
		"marks a $key call inside a nested mode",
		({ key, code, expected }, { expect }) => {
			expect(callNames(extended.highlight(key, code))).toEqual(expected)
		},
	)

	it("keeps the relevance score of the stock grammar", ({ expect }) => {
		const code = 'func main() {\n\tfmt.Println(foo("a"))\n}'

		expect(extended.highlight("go", code).data?.relevance).toBe(
			stock.highlight("go", code).data?.relevance,
		)
	})
})

describe("extendedCodeBlockLanguageOptions", () => {
	it("lists every registered grammar", ({ expect }) => {
		expect(Object.keys(extendedCodeBlockLanguageOptions).toSorted()).toEqual(
			Object.keys(extendedCodeBlockLanguages).toSorted(),
		)
	})

	it("orders the entries alphabetically by grammar key", ({ expect }) => {
		const keys = Object.keys(extendedCodeBlockLanguageOptions)

		expect(keys).toEqual(keys.toSorted())
	})

	it("gives every grammar a display name", ({ expect }) => {
		const unnamed = Object.entries(extendedCodeBlockLanguageOptions)
			.filter(([, name]) => name === undefined)
			.map(([key]) => key)

		expect(unnamed).toEqual([])
	})

	it.for([
		{ key: "cpp", expected: "C++" },
		{ key: "csharp", expected: "C#" },
		{ key: "curl", expected: "cURL" },
		{ key: "objectivec", expected: "Objective-C" },
		{ key: "php-template", expected: "PHP Template" },
		{ key: "vbnet", expected: "VB.Net" },
		{ key: "wasm", expected: "WebAssembly" },
		{ key: "xml", expected: "XML / HTML" },
	])("labels $key as $expected", ({ key, expected }, { expect }) => {
		expect(extendedCodeBlockLanguageOptions[key]).toBe(expected)
	})
})

describe("defaultExtendedCodeBlockLanguage", () => {
	it("names a registered grammar", ({ expect }) => {
		expect(defaultExtendedCodeBlockLanguage).toBe("plaintext")
		expect(
			extendedCodeBlockLanguages[defaultExtendedCodeBlockLanguage],
		).toBeTypeOf("function")
	})
})

type Root = ReturnType<ReturnType<typeof createLowlight>["highlight"]>

function callNames(node: Root | Root["children"][number]): string[] {
	if (!("children" in node)) {
		return []
	}

	const nested = node.children.flatMap(callNames)
	if (node.type !== "element") {
		return nested
	}

	const classes = node.properties.className
	if (!Array.isArray(classes) || !classes.includes("invoke__")) {
		return nested
	}

	const text = node.children[0]

	return text?.type === "text" ? [text.value] : nested
}
