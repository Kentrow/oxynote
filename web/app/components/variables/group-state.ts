// useGroupOpenState holds which variable groups are open, for this page load
// only. A choice is kept per section, since one group can show in two, and
// a group created since the load starts open wherever it shows.
export function useGroupOpenState() {
	const chosen = useState<Record<string, boolean>>(
		"variable-groups-open",
		() => ({}),
	)
	const created = useState<string[]>("variable-groups-created", () => [])

	return { chosen, created }
}
