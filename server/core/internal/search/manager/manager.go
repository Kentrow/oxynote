// Package manager queues and applies search-indexing jobs.
package manager

import (
	"context"
	"fmt"
	"time"

	"github.com/oxynote/oxynote/server/core/internal/document"
	"github.com/oxynote/oxynote/server/core/internal/job"
	"github.com/oxynote/oxynote/server/core/internal/search"
	"github.com/oxynote/oxynote/server/core/pkg/errutil"
	"github.com/oxynote/oxynote/server/core/pkg/sqlutil"
	"github.com/rs/xid"
)

// _pollInterval specifies how often the search queue is checked for jobs.
// The queue runs one job per check, so this also caps how many index
// updates a second core can apply.
var _pollInterval = 100 * time.Millisecond

// Manager queues search jobs and applies them: for every scope it reads
// the current rows and makes the index match them.
type Manager struct {
	db    DB
	index Index
	queue Queue
}

// NewManager creates a new Manager and registers its job queue with the
// job manager.
func NewManager(db DB, index Index, jobMan JobManager) (*Manager, error) {
	m := &Manager{
		db:    db,
		index: index,
	}

	// one job at a time, so two syncs of a scope never race and leave the
	// older read in the index.
	q := job.NewQueue(job.QueueIndexSearch, m.processJob, job.QueueOptions{
		Concurrency:  1,
		PollInterval: _pollInterval,
	})
	if err := jobMan.Register(q); err != nil {
		return nil, fmt.Errorf("registering the search queue: %w", err)
	}

	m.queue = q

	return m, nil
}

// Enqueue queues the job on the transaction, to run once it commits.
func (m *Manager) Enqueue(ctx context.Context, tx sqlutil.Tx, j search.Job) error {
	return m.queue.Enqueue(ctx, tx, j)
}

// processJob brings the job's scope in line with the database. It is safe to
// repeat, since it compares the scope's current rows, not a change.
func (m *Manager) processJob(ctx context.Context, j search.Job) error {
	switch {
	case j.BranchID.Valid:
		return m.syncBranch(ctx, j.BranchID.V)
	case j.DocumentID.Valid:
		return m.syncDocument(ctx, j.DocumentID.V)
	default:
		// an organization is queued only by its teardown, which runs
		// while its rows still exist, so there is nothing to compare
		// against: the scope is always a removal.
		return m.index.DeleteOrganization(ctx, j.OrganizationID)
	}
}

// syncBranch replaces the branch's entries with what the database holds,
// or removes them when the branch is gone.
func (m *Manager) syncBranch(ctx context.Context, branchID xid.ID) error {
	doc, err := m.db.FetchDocumentUnsafeByBranchID(ctx, branchID)
	if err != nil {
		if errutil.IsNotFound(err) {
			return m.index.DeleteBranch(ctx, branchID)
		}

		return fmt.Errorf("fetching branch %s: %w", branchID, err)
	}

	return m.index.ReplaceBranch(ctx, branchID, search.Entries(*doc))
}

// syncDocument syncs every branch of the document, or removes the
// document's entries when it has none left.
func (m *Manager) syncDocument(ctx context.Context, documentID xid.ID) error {
	branches, err := m.db.FetchDocumentBranchesUnsafe(ctx, documentID)
	if err != nil {
		return fmt.Errorf("fetching branches of document %s: %w", documentID, err)
	}

	if len(branches) == 0 {
		return m.index.DeleteDocument(ctx, documentID)
	}

	for _, b := range branches {
		if err := m.syncBranch(ctx, b.BranchID); err != nil {
			return err
		}
	}

	return nil
}

// JobManager defines the job manager operations required by the Manager.
//
//go:generate ../../../scripts/codegen/mock -t internal JobManager job_manager
type JobManager interface {
	// Register should add the queue to the job manager.
	Register(q job.Registrable) error
}

// Queue defines the job queue operations required by the Manager.
//
//go:generate ../../../scripts/codegen/mock -t internal Queue queue
type Queue interface {
	// Enqueue should queue the job on the transaction, to run once it
	// commits.
	Enqueue(ctx context.Context, tx sqlutil.Tx, j search.Job) error
}

// DB defines the database operations required by the Manager.
//
//go:generate ../../../scripts/codegen/mock -t internal DB db
type DB interface {
	// FetchDocumentUnsafeByBranchID should fetch the document joined
	// against the branch, across organizations.
	FetchDocumentUnsafeByBranchID(ctx context.Context, branchID xid.ID) (*document.Document, error)

	// FetchDocumentBranchesUnsafe should fetch the document's branches,
	// across organizations.
	FetchDocumentBranchesUnsafe(ctx context.Context, docID xid.ID) ([]document.BranchSummary, error)
}

// Index defines the index operations required by the Manager.
//
//go:generate ../../../scripts/codegen/mock -t internal Index index
type Index interface {
	// ReplaceBranch should make the branch's entries exactly the given
	// ones.
	ReplaceBranch(ctx context.Context, branchID xid.ID, entries map[string]search.Block) error

	// DeleteBranch should remove every entry of the branch.
	DeleteBranch(ctx context.Context, branchID xid.ID) error

	// DeleteDocument should remove every entry of the document.
	DeleteDocument(ctx context.Context, documentID xid.ID) error

	// DeleteOrganization should remove every entry of the organization.
	DeleteOrganization(ctx context.Context, organizationID string) error
}
