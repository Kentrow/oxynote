import { nanoid } from "nanoid"
import isDeepEqual from "fast-deep-equal"
import type {
	VariableCreateResponse,
	VariableGroupCreateRequest,
	VariableGroupCreateResponse,
	VariableGroupMoveRequest,
	VariableGroupUpdateRequest,
	VariableMoveRequest,
	VariableRequest,
	VariableTreeElement,
	VariableTreeResponse,
	VariableValueRequest,
} from "~/utils"

export const VARIABLE_QUERY_KEYS = {
	tree: ["variables", "tree"] as const,
}

const VARIABLE_MUTATION_KEYS = {
	value: ["variables", "value"] as const,
}

const VARIABLE_PATHS = {
	variables: "/api/variables",
	tree: "/api/variables/tree",
	variable: (id: string) => `/api/variables/${id}`,
	variableDefault: (id: string) => `/api/variables/${id}/default`,
	variableValue: (id: string) => `/api/variables/${id}/value`,
	groups: "/api/variables/groups",
	groupTree: "/api/variables/groups/tree",
	group: (id: string) => `/api/variables/groups/${id}`,
}

export default function () {
	const { $coreAPIClient } = useNuxtApp()
	const queryCache = useQueryCache()
	const mutationCache = useMutationCache()
	const { fetchAuthSession, fetchOrganization } = useAuthSession()

	const fetchVariables = useQuery({
		key: VARIABLE_QUERY_KEYS.tree,
		query: async () => {
			return await $coreAPIClient<VariableTreeResponse>(VARIABLE_PATHS.tree, {
				method: "GET",
			})
		},
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		staleTime: 3 * 60 * 1000, // 3mins
		autoRefetch: true,
	})

	const createVariable = useMutation({
		onMutate(req: VariableRequest) {
			if (!isXid(req.groupId)) {
				// optimisticInserts use nanoid
				return
			}

			const userId = fetchAuthSession.data.value?.data?.user.id
			const organizationId = fetchOrganization.data.value?.data?.id

			if (!userId || !organizationId) {
				// do not pre-insert if we don't have user or organization info
				return
			}

			return editTree((tree) => {
				const group = tree.find((g) => g.id === req.groupId)
				if (!group) {
					throw new Error("invalid variable data")
				}

				// a new variable goes to the end of its group
				group.variables.push(
					applyVariableRequest(
						{
							id: nanoid(),
							organizationId: organizationId,
							groupId: req.groupId,
							key: req.key,
							name: req.name,
							description: null,
							type: req.type,
							defaultValue: null,
							sortIndex: group.variables.length,
							builtin: false,
							createdAt: new Date(),
							createdBy: userId,
							value: null,
							options: [],
							localOptimisticInsert: true,
						},
						req,
					),
				)

				return tree
			})
		},
		mutation: async (req: VariableRequest) => {
			if (!isXid(req.groupId)) {
				// optimisticInserts use nanoid
				return
			}

			return await $coreAPIClient<VariableCreateResponse>(
				VARIABLE_PATHS.variables,
				{
					method: "POST",
					body: req,
				},
			)
		},
		async onSuccess(_data, req) {
			if (!isXid(req.groupId)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const moveVariable = useMutation({
		onMutate(req: VariableMoveRequest) {
			if (!isXid(req.id) || !isXid(req.groupId)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				const variable = findVariable(tree, req.id)
				const group = tree.find((g) => g.id === req.groupId)
				if (!variable || !group) {
					throw new Error("invalid variable move data")
				}

				tree.forEach((g) => {
					g.variables = g.variables.filter((v) => v.id !== req.id)
				})

				variable.groupId = req.groupId
				group.variables.splice(req.sortIndex, 0, variable)

				return tree
			})
		},
		mutation: async (req: VariableMoveRequest) => {
			if (!isXid(req.id) || !isXid(req.groupId)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.tree, {
				method: "PUT",
				body: req,
			})
		},
		async onSuccess(_data, req) {
			if (!isXid(req.id) || !isXid(req.groupId)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const updateVariable = useMutation({
		onMutate({ id, req }: { id: string; req: VariableRequest }) {
			if (!isXid(id) || !isXid(req.groupId)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				const variable = findVariable(tree, id)
				const group = tree.find((g) => g.id === req.groupId)
				if (!variable || !group) {
					throw new Error("invalid variable data")
				}

				const updated = applyVariableRequest(variable, req)

				// a variable given another group goes to the end of it
				if (req.groupId === variable.groupId) {
					group.variables = group.variables.map((v) =>
						v.id === id ? updated : v,
					)
				} else {
					tree.forEach((g) => {
						g.variables = g.variables.filter((v) => v.id !== id)
					})

					group.variables.push(updated)
				}

				return tree
			})
		},
		mutation: async ({ id, req }: { id: string; req: VariableRequest }) => {
			if (!isXid(id) || !isXid(req.groupId)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.variable(id), {
				method: "PUT",
				body: req,
			})
		},
		async onSuccess(_data, { id, req }) {
			if (!isXid(id) || !isXid(req.groupId)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const deleteVariable = useMutation({
		onMutate(id: string) {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				tree.forEach((g) => {
					g.variables = g.variables.filter((v) => v.id !== id)
				})

				return tree
			})
		},
		mutation: async (id: string) => {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.variable(id), {
				method: "DELETE",
			})
		},
		async onSuccess(_data, id) {
			if (!isXid(id)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _id, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const setVariableDefault = useMutation({
		onMutate({ id, req }: { id: string; req: VariableValueRequest }) {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				const variable = findVariable(tree, id)
				if (!variable) {
					throw new Error("invalid variable default data")
				}

				variable.defaultValue = req.value

				// a list's default is its first option, so the chosen option
				// moves to the top
				if (variable.type === "list") {
					const index = variable.options.findIndex((o) => o.id === req.value)
					if (index === -1) {
						throw new Error("invalid variable default data")
					}

					variable.options.unshift(...variable.options.splice(index, 1))
					variable.options.forEach((o, i) => {
						o.sortIndex = i
					})
				}

				return tree
			})
		},
		mutation: async ({
			id,
			req,
		}: {
			id: string
			req: VariableValueRequest
		}) => {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.variableDefault(id), {
				method: "PUT",
				body: req,
			})
		},
		async onSuccess(_data, { id }) {
			if (!isXid(id)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const setVariableValue = useMutation({
		key: VARIABLE_MUTATION_KEYS.value,
		onMutate({ id, req }: { id: string; req: VariableValueRequest }) {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				const variable = findVariable(tree, id)
				if (!variable) {
					throw new Error("invalid variable value data")
				}

				variable.value = req.value

				return tree
			})
		},
		mutation: async ({
			id,
			req,
		}: {
			id: string
			req: VariableValueRequest
		}) => {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.variableValue(id), {
				method: "PUT",
				body: req,
			})
		},
		async onSuccess(_data, { id }) {
			if (!isXid(id)) {
				return
			}

			await invalidateTreeAfterValueSave()
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const resetVariableValue = useMutation({
		key: VARIABLE_MUTATION_KEYS.value,
		onMutate(id: string) {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				const variable = findVariable(tree, id)
				if (!variable) {
					throw new Error("invalid variable value data")
				}

				variable.value = null

				return tree
			})
		},
		mutation: async (id: string) => {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.variableValue(id), {
				method: "DELETE",
			})
		},
		async onSuccess(_data, id) {
			if (!isXid(id)) {
				return
			}

			await invalidateTreeAfterValueSave()
		},
		onError(_err, _id, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const createVariableGroup = useMutation({
		onMutate(req: VariableGroupCreateRequest) {
			const userId = fetchAuthSession.data.value?.data?.user.id
			const organizationId = fetchOrganization.data.value?.data?.id

			if (!userId || !organizationId) {
				// do not pre-insert if we don't have user or organization info
				return
			}

			// a new group goes to the end
			return editTree((tree) => [
				...tree,
				{
					id: nanoid(),
					organizationId: organizationId,
					groupName: req.groupName,
					color: req.color,
					sortIndex: tree.length,
					builtin: false,
					createdAt: new Date(),
					createdBy: userId,
					variables: [],
					localOptimisticInsert: true,
				},
			])
		},
		mutation: async (req: VariableGroupCreateRequest) => {
			return await $coreAPIClient<VariableGroupCreateResponse>(
				VARIABLE_PATHS.groups,
				{
					method: "POST",
					body: req,
				},
			)
		},
		async onSuccess() {
			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const moveVariableGroup = useMutation({
		onMutate(req: VariableGroupMoveRequest) {
			if (!isXid(req.id)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				// the built-in group always stays first, and the sort index
				// counts only the groups after it
				const movable = tree.filter((g) => !g.builtin)

				const oldIndex = movable.findIndex((g) => g.id === req.id)
				if (oldIndex === -1) {
					throw new Error("invalid variable group move data")
				}

				movable.splice(req.sortIndex, 0, ...movable.splice(oldIndex, 1))

				return [...tree.filter((g) => g.builtin), ...movable]
			})
		},
		mutation: async (req: VariableGroupMoveRequest) => {
			if (!isXid(req.id)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.groupTree, {
				method: "PUT",
				body: req,
			})
		},
		async onSuccess(_data, req) {
			if (!isXid(req.id)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const updateVariableGroup = useMutation({
		onMutate({ id, req }: { id: string; req: VariableGroupUpdateRequest }) {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => {
				const group = tree.find((g) => g.id === id)
				if (!group) {
					throw new Error("invalid variable group data")
				}

				group.groupName = req.groupName ?? group.groupName
				group.color = req.color ?? group.color

				return tree
			})
		},
		mutation: async ({
			id,
			req,
		}: {
			id: string
			req: VariableGroupUpdateRequest
		}) => {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.group(id), {
				method: "PUT",
				body: req,
			})
		},
		async onSuccess(_data, { id }) {
			if (!isXid(id)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _req, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	const deleteVariableGroup = useMutation({
		onMutate(id: string) {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			return editTree((tree) => tree.filter((g) => g.id !== id))
		},
		mutation: async (id: string) => {
			if (!isXid(id)) {
				// optimisticInserts use nanoid
				return
			}

			await $coreAPIClient(VARIABLE_PATHS.group(id), {
				method: "DELETE",
			})
		},
		async onSuccess(_data, id) {
			if (!isXid(id)) {
				return
			}

			await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
		},
		onError(_err, _id, { oldTree, newTree }) {
			rollbackTree(oldTree, newTree)
		},
	})

	// invalidateTreeAfterValueSave refetches the tree once the last value
	// save in flight is done. An earlier refetch could return a value that
	// a later save is still replacing, and the sidebar would jump back to it.
	async function invalidateTreeAfterValueSave() {
		const saving = mutationCache.getEntries({
			key: VARIABLE_MUTATION_KEYS.value,
			predicate: (entry) => entry.asyncStatus.value === "loading",
		})
		if (saving.length > 1) {
			return
		}

		await queryCache.invalidateQueries({ key: VARIABLE_QUERY_KEYS.tree })
	}

	// editTree caches the edited copy of the tree and returns it with the
	// tree it replaced, for a rollback
	function editTree(
		edit: (tree: VariableTreeResponse) => VariableTreeResponse,
	) {
		const oldTree = clone(
			queryCache.getQueryData<VariableTreeResponse>(VARIABLE_QUERY_KEYS.tree),
		)
		const newTree = edit(clone(oldTree) ?? [])

		queryCache.setQueryData(VARIABLE_QUERY_KEYS.tree, newTree)
		queryCache.cancelQueries({ key: VARIABLE_QUERY_KEYS.tree })

		return { newTree, oldTree }
	}

	// rollbackTree restores the cached tree after a failed mutation, unless
	// the mutation left it alone or something else has written it since
	function rollbackTree(
		oldTree: VariableTreeResponse | undefined,
		newTree: VariableTreeResponse | undefined,
	) {
		if (!newTree) {
			return
		}

		const cachedTree = queryCache.getQueryData(VARIABLE_QUERY_KEYS.tree)
		if (!isDeepEqual(newTree, cachedTree)) {
			return
		}

		queryCache.setQueryData(VARIABLE_QUERY_KEYS.tree, oldTree)
	}

	return {
		fetchVariables,
		createVariable,
		moveVariable,
		updateVariable,
		deleteVariable,
		setVariableDefault,
		setVariableValue,
		resetVariableValue,
		createVariableGroup,
		moveVariableGroup,
		updateVariableGroup,
		deleteVariableGroup,
	}
}

// findVariable returns the variable carrying the given id from any group.
function findVariable(
	tree: VariableTreeResponse,
	id: string,
): VariableTreeElement | null {
	for (const group of tree) {
		const variable = group.variables.find((v) => v.id === id)
		if (variable) {
			return variable
		}
	}

	return null
}

// applyVariableRequest returns the variable as the request leaves it. An option keeps the id the request names. A list's default is
// its first option. A changed type, or a list losing the picked option,
// drops the user's own value.
function applyVariableRequest(
	variable: VariableTreeElement,
	req: VariableRequest,
): VariableTreeElement {
	const options = (req.options ?? []).map((o, i) => ({
		id: o.id ?? nanoid(),
		variableId: variable.id,
		value: o.value,
		sortIndex: i,
	}))
	const keepsValue =
		req.type === variable.type &&
		(req.type !== "list" || options.some((o) => o.id === variable.value))

	return {
		...variable,
		groupId: req.groupId,
		key: req.key,
		name: req.name,
		description: req.description ?? null,
		type: req.type,
		defaultValue:
			req.type === "list"
				? (options[0]?.id ?? null)
				: (req.defaultValue ?? null),
		options: options,
		value: keepsValue ? variable.value : null,
	}
}
