package search

import (
	"github.com/guregu/null/v5"
	"github.com/rs/xid"
)

// Job names a scope of the index to bring back in line with the database:
// a branch, a whole document, or a whole organization. It carries no
// content, so applying it in any order or any number of times yields the
// same index.
type Job struct {
	// OrganizationID is the organization the scope belongs to.
	OrganizationID string `json:"organizationId"`

	// DocumentID is the document the scope narrows to, if any.
	DocumentID null.Value[xid.ID] `json:"documentId"`

	// BranchID is the branch the scope narrows to, if any.
	BranchID null.Value[xid.ID] `json:"branchId"`
}

// BranchScope names one branch of a document.
func BranchScope(organizationID string, documentID, branchID xid.ID) Job {
	return Job{
		OrganizationID: organizationID,
		DocumentID:     null.ValueFrom(documentID),
		BranchID:       null.ValueFrom(branchID),
	}
}

// DocumentScope names every branch of a document.
func DocumentScope(organizationID string, documentID xid.ID) Job {
	return Job{
		OrganizationID: organizationID,
		DocumentID:     null.ValueFrom(documentID),
	}
}

// OrganizationScope names every entry of an organization.
func OrganizationScope(organizationID string) Job {
	return Job{
		OrganizationID: organizationID,
	}
}
