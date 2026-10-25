// carries no payload: a subscriber refetches the whole variable tree
export const WS_VARIABLES_CHANGE_TOPIC = "change@variables"

export type VariableType = "list" | "number" | "text" | "time-range"

export interface VariableGroup {
	id: string
	organizationId: string
	groupName: string
	color: string
	sortIndex: number
	builtin: boolean
	createdAt: Date | string
	createdBy: string | null
}

export interface Variable {
	id: string
	organizationId: string
	groupId: string
	// referenced as `$key` in documents; stored without the `$`
	key: string
	name: string
	description: string | null
	type: VariableType
	// for a list, the id of its first option
	defaultValue: string | null
	sortIndex: number
	builtin: boolean
	createdAt: Date | string
	createdBy: string | null
	// a list's options in order; empty for any other type
	options: VariableOption[]
}

export interface VariableOption {
	id: string
	variableId: string
	value: string
	sortIndex: number
}

export interface VariableTreeElement extends Variable {
	// the signed-in user's own value; null means they see the default
	value: string | null

	// local-only
	localOptimisticInsert?: boolean
}

export interface VariableGroupTreeElement extends VariableGroup {
	variables: VariableTreeElement[]

	// local-only
	localOptimisticInsert?: boolean
}

export type VariableTreeResponse = VariableGroupTreeElement[]

export interface VariableGroupCreateRequest {
	groupName: string
	color: string
}

export type VariableGroupCreateResponse = VariableGroup

export interface VariableGroupUpdateRequest {
	groupName?: string
	color?: string
}

export interface VariableGroupMoveRequest {
	id: string
	sortIndex: number
}

export interface VariableOptionRequest {
	// set to keep an existing option's identity
	id?: string
	value: string
}

export interface VariableRequest {
	groupId: string
	key: string
	name: string
	description?: string | null
	type: VariableType
	// must be absent or null for a list: its first option is the default
	defaultValue?: string | null
	// list only, in display order
	options?: VariableOptionRequest[]
}

export type VariableCreateResponse = Variable

export interface VariableMoveRequest {
	id: string
	groupId: string
	sortIndex: number
}

// an option id for a list, a decimal string for a number, a preset key for
// a time range and any text for a text variable
export interface VariableValueRequest {
	value: string
}
