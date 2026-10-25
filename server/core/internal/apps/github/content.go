// Package github manages GitHub App installations and API access.
package github

import (
	"slices"
	"strings"

	gogithub "github.com/google/go-github/v88/github"
)

// TreeItemType represents the type of a tree item, either a file or a folder.
type TreeItemType string

const (
	// TreeItemTypeFile represents a file in the tree.
	TreeItemTypeFile TreeItemType = "file"

	// TreeItemTypeFolder represents a folder in the tree.
	TreeItemTypeFolder TreeItemType = "folder"
)

// Repository represents a GitHub repository.
type Repository struct {
	// Name is the name of the repository.
	Name string `json:"name"`

	// DefaultBranch is the default branch of the repository.
	DefaultBranch string `json:"defaultBranch"`
}

// Tree represents a Git tree structure.
type Tree []TreeItem

// GetItem retrieves a TreeItem from the tree based on the given path.
func (t Tree) GetItem(path string) (TreeItem, bool) {
	parts := strings.Split(path, "/")

	items := t

	for i := range parts {
		j := slices.IndexFunc(items, func(ti TreeItem) bool {
			return ti.Name == strings.Join(parts[:i+1], "/")
		})
		if j == -1 {
			return TreeItem{}, false
		}

		item := items[j]

		if i != len(parts)-1 {
			if item.Type != TreeItemTypeFolder {
				return TreeItem{}, false
			}

			items = item.Items

			continue
		}

		return item, true
	}

	return TreeItem{}, false
}

// TreeItem represents an item in a Git tree structure.
type TreeItem struct {
	// Type is the type of the tree item.
	Type TreeItemType `json:"type"`

	// Name is the file path of the tree item.
	Name string `json:"name"`

	// Items is a list of child tree items, if any.
	Items []TreeItem `json:"items,omitempty"`

	// Checksum is the checksum of the item.
	Checksum string `json:"checksum"`
}

// treeNode is an intermediate pointer-based tree used while parsing. Items
// are materialized into value slices only once the tree is fully built, as
// growing value slices mid-build would leave parent pointers referencing
// stale backing arrays.
type treeNode struct {
	item     TreeItem
	children []*treeNode
}

// ParseTreeItems converts a list of GitHub TreeEntry objects into a
// list of TreeItem objects. Entries whose parent folder is not present
// in the list are skipped.
func ParseTreeItems(items []*gogithub.TreeEntry) []TreeItem {
	var (
		roots   []*treeNode
		folders = make(map[string]*treeNode)
	)

	for _, entry := range items {
		path := entry.GetPath()

		node := &treeNode{
			item: TreeItem{
				Type:     parseTreeItemType(entry.GetType()),
				Name:     path,
				Checksum: entry.GetSHA(),
			},
		}

		if node.item.Type == TreeItemTypeFolder {
			folders[path] = node
		}

		dir, _, ok := strings.CutLast(path, "/")
		if !ok {
			roots = append(roots, node)

			continue
		}

		parent := folders[dir]
		if parent == nil {
			continue
		}

		parent.children = append(parent.children, node)
	}

	return materializeTreeNodes(roots)
}

// materializeTreeNodes converts a pointer-based node tree into the value
// slices exposed by Tree.
func materializeTreeNodes(nodes []*treeNode) []TreeItem {
	if len(nodes) == 0 {
		return nil
	}

	res := make([]TreeItem, 0, len(nodes))

	for _, node := range nodes {
		node.item.Items = materializeTreeNodes(node.children)
		res = append(res, node.item)
	}

	return res
}

// parseTreeItemType converts a GitHub tree entry type string to a TreeItemType.
func parseTreeItemType(tp string) TreeItemType {
	if tp == "tree" {
		return TreeItemTypeFolder
	}

	return TreeItemTypeFile
}
