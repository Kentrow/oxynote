import type { Editor } from "@tiptap/core"
import type { Node as PMNode } from "@tiptap/pm/model"
import {
	pageVariableKeys,
	usedVariableIds as usedIds,
} from "~/components/variables/variables"

// useVariableUsage follows the page's content and reports which variables
// it uses, by the $key references in its blocks
export function useVariableUsage(editor: MaybeRefOrGetter<Editor | null>) {
	const { fetchVariables } = useVariableAPI()
	const doc = shallowRef<PMNode | null>(null)
	const refreshDoc = useDebounceFn((ed: Editor) => {
		if (!ed.isDestroyed) {
			doc.value = ed.state.doc
		}
	}, 300)

	const usedVariableIds = computed(() => {
		const tree = fetchVariables.data.value ?? []

		return doc.value
			? usedIds(tree, pageVariableKeys(doc.value))
			: new Set<string>()
	})
	const totalCount = computed(() =>
		(fetchVariables.data.value ?? []).reduce(
			(count, group) => count + group.variables.length,
			0,
		),
	)

	watchImmediate(
		() => toValue(editor),
		(ed, _old, onCleanup) => {
			doc.value = null
			if (!ed || ed.isDestroyed) {
				return
			}

			doc.value = ed.state.doc

			const handleUpdate = () => {
				void refreshDoc(ed)
			}
			const handleDestroy = () => {
				doc.value = null
			}

			ed.on("update", handleUpdate)
			ed.on("destroy", handleDestroy)
			onCleanup(() => {
				ed.off("update", handleUpdate)
				ed.off("destroy", handleDestroy)
			})
		},
	)

	return { usedVariableIds, totalCount }
}
