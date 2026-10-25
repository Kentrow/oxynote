import { common } from "lowlight"
import type { LanguageFn, Mode } from "highlight.js"
import curl from "highlightjs-curl"

const languageNames: Record<string, string> = {
	arduino: "Arduino",
	bash: "Bash",
	curl: "cURL",
	c: "C",
	cpp: "C++",
	csharp: "C#",
	css: "CSS",
	diff: "Diff",
	go: "Go",
	graphql: "GraphQL",
	ini: "INI",
	java: "Java",
	javascript: "JavaScript",
	json: "JSON",
	kotlin: "Kotlin",
	less: "Less",
	lua: "Lua",
	makefile: "Makefile",
	markdown: "Markdown",
	objectivec: "Objective-C",
	perl: "Perl",
	php: "PHP",
	"php-template": "PHP Template",
	plaintext: "Plaintext",
	python: "Python",
	"python-repl": "Python REPL",
	r: "R",
	ruby: "Ruby",
	rust: "Rust",
	scss: "SCSS",
	shell: "Shell",
	sql: "SQL",
	swift: "Swift",
	typescript: "TypeScript",
	vbnet: "VB.Net",
	wasm: "WebAssembly",
	xml: "XML / HTML",
	yaml: "YAML",
}
// grammars that leave function calls unmarked
const callLanguages = [
	"csharp",
	"go",
	"java",
	"kotlin",
	"python",
	"ruby",
	"swift",
]
export const extendedCodeBlockLanguages = { ...common }
extendedCodeBlockLanguages.curl = curl as LanguageFn

for (const [key, grammar] of Object.entries(common)) {
	if (callLanguages.includes(key)) {
		extendedCodeBlockLanguages[key] = withFunctionCalls(grammar)
	}
}

export const extendedCodeBlockLanguageOptions = Object.fromEntries(
	Object.keys(extendedCodeBlockLanguages)
		.sort((a, b) => (a < b ? -1 : 1))
		.map((key) => {
			return [key, languageNames[key]]
		}),
)
export const defaultExtendedCodeBlockLanguage = "plaintext"

function withFunctionCalls(grammar: LanguageFn): LanguageFn {
	return (hljs) => {
		const language = grammar(hljs)
		// each of these grammars groups its keywords by scope
		const groups = language.keywords as Record<string, string | string[]>
		const keywords = new Set(
			Object.entries(groups)
				.filter(([scope]) => !scope.startsWith("$"))
				.flatMap(([, names]) =>
					typeof names === "string" ? names.split(/\s+/) : names,
				)
				// a name may carry a relevance suffix: "name|0"
				.map((name) => name.replace(/\|.*/, "")),
		)
		const call: Mode = {
			scope: "title.function.invoke",
			match: /\b[A-Za-z_]\w*(?=\s*\()/,
			// language detection compares relevance scores. A call must not
			// add to them.
			relevance: 0,
			// a mode match wins over a keyword, so `if (` would turn into
			// a call
			"on:begin": (match, response) => {
				if (keywords.has(match[0])) {
					response.ignoreMatch()
				}
			},
		}
		const seen = new Set<Mode>([call])

		// nested modes do not inherit the top level rules. Modes with keywords
		// hold code, such as parameters and string interpolation.
		const visit = (mode: Mode | "self" | undefined | null) => {
			if (!mode || mode === "self" || seen.has(mode)) {
				return
			}

			seen.add(mode)
			mode.contains?.forEach(visit)
			mode.variants?.forEach(visit)
			visit(mode.starts)

			if ((mode === language || mode.keywords) && mode.contains) {
				mode.contains.push(call)
			}
		}

		visit(language)

		return language
	}
}
