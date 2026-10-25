// Package variable provides HTTP handlers for an organization's global
// variables.
package variable

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/guregu/null/v5"
	"github.com/oxynote/oxynote/server/core/internal/server/internal/auth"
	variableCore "github.com/oxynote/oxynote/server/core/internal/variable"
	"github.com/oxynote/oxynote/server/core/pkg/httpserver"
	"github.com/rs/xid"
)

// Handler holds dependencies required for variable operations.
type Handler struct {
	log *slog.Logger
	man Manager

	changeCallback func(organizationID string, userID null.String)
}

// NewHandler creates a new variable handling instance.
func NewHandler(log *slog.Logger, man Manager) *Handler {
	return &Handler{
		log: log.With("component", "variable-handler"),
		man: man,
	}
}

// FetchVariableTree handles the retrieval of the organization's groups,
// variables and options, each variable with the caller's own value.
func (h *Handler) FetchVariableTree(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	tree, err := h.man.FetchTree(r.Context(), session.ActiveOrganizationID, session.UserID)
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, tree, http.StatusOK)
}

// CreateVariableGroup handles the creation of a group.
func (h *Handler) CreateVariableGroup(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	var inp variableCore.GroupCreateInput

	if err := httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	g, err := h.man.CreateGroup(r.Context(), inp, session.ActiveOrganizationID, session.UserID)
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, g, http.StatusCreated)
}

// UpdateVariableGroup handles renaming or recolouring a group.
func (h *Handler) UpdateVariableGroup(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	id, err := httpserver.ExtractNamedID(r, "groupId")
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	var inp variableCore.GroupUpdateInput

	if err = httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err = h.man.UpdateGroup(r.Context(), id, inp, session.ActiveOrganizationID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// UpdateVariableGroupTree handles moving a group to another position.
func (h *Handler) UpdateVariableGroupTree(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	var inp variableCore.GroupMoveInput

	if err := httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err := h.man.MoveGroup(r.Context(), inp, session.ActiveOrganizationID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// DeleteVariableGroup handles the removal of an empty group.
func (h *Handler) DeleteVariableGroup(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	id, err := httpserver.ExtractNamedID(r, "groupId")
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err = h.man.DeleteGroup(r.Context(), id, session.ActiveOrganizationID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// CreateVariable handles the creation of a variable.
func (h *Handler) CreateVariable(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	var inp variableCore.Input

	if err := httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	v, err := h.man.CreateVariable(r.Context(), inp, session.ActiveOrganizationID, session.UserID)
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, v, http.StatusCreated)
}

// UpdateVariable handles replacing a variable's definition.
func (h *Handler) UpdateVariable(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	id, err := httpserver.ExtractNamedID(r, "variableId")
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	var inp variableCore.Input

	if err = httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err = h.man.UpdateVariable(r.Context(), id, inp, session.ActiveOrganizationID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// UpdateVariableTree handles moving a variable to another position, in
// its own group or another one.
func (h *Handler) UpdateVariableTree(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	var inp variableCore.MoveInput

	if err := httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err := h.man.MoveVariable(r.Context(), inp, session.ActiveOrganizationID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// DeleteVariable handles the removal of a variable.
func (h *Handler) DeleteVariable(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	id, err := httpserver.ExtractNamedID(r, "variableId")
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err = h.man.DeleteVariable(r.Context(), id, session.ActiveOrganizationID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// SetVariableDefault handles setting the value everyone without their own
// value sees.
func (h *Handler) SetVariableDefault(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	id, err := httpserver.ExtractNamedID(r, "variableId")
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	var inp variableCore.ValueInput

	if err = httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err = h.man.SetDefaultValue(r.Context(), id, inp.Value, session.ActiveOrganizationID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// SetVariableValue handles setting the caller's own value.
func (h *Handler) SetVariableValue(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	id, err := httpserver.ExtractNamedID(r, "variableId")
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	var inp variableCore.ValueInput

	if err = httpserver.DecodeJSON(r, &inp); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	err = h.man.SetValue(
		r.Context(),
		id,
		inp.Value,
		session.ActiveOrganizationID,
		session.UserID,
	)
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// ResetVariableValue handles removing the caller's own value, so they see
// the default again.
func (h *Handler) ResetVariableValue(w http.ResponseWriter, r *http.Request) {
	session, ok := auth.RequireSession(h.log, w, r)
	if !ok {
		return
	}

	id, err := httpserver.ExtractNamedID(r, "variableId")
	if err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	if err = h.man.ResetValue(r.Context(), id, session.ActiveOrganizationID, session.UserID); err != nil {
		httpserver.RespondError(h.log, w, err)
		return
	}

	httpserver.Respond(h.log, w, nil, http.StatusNoContent)
}

// Manager runs the variable reads and writes and announces the writes.
//
//go:generate ../../../../scripts/codegen/mock -t internal Manager manager
type Manager interface {
	GroupManager

	// FetchTree should fetch the organization's groups, variables and
	// options in order, each variable with the user's own value.
	FetchTree(ctx context.Context, organizationID, userID string) (variableCore.Tree, error)

	// CreateVariable should create a variable at the end of its group.
	CreateVariable(ctx context.Context, inp variableCore.Input, organizationID, userID string) (*variableCore.Variable, error)

	// UpdateVariable should replace a variable's definition.
	UpdateVariable(ctx context.Context, id xid.ID, inp variableCore.Input, organizationID string) error

	// MoveVariable should move a variable to a position in a group.
	MoveVariable(ctx context.Context, inp variableCore.MoveInput, organizationID string) error

	// DeleteVariable should delete a variable.
	DeleteVariable(ctx context.Context, id xid.ID, organizationID string) error

	// SetDefaultValue should set the value everyone without their own
	// value sees.
	SetDefaultValue(ctx context.Context, id xid.ID, value, organizationID string) error

	// SetValue should set the user's own value.
	SetValue(ctx context.Context, id xid.ID, value, organizationID, userID string) error

	// ResetValue should remove the user's own value.
	ResetValue(ctx context.Context, id xid.ID, organizationID, userID string) error
}

// GroupManager runs the group writes and announces them.
type GroupManager interface {
	// CreateGroup should create a group at the end of the organization's
	// groups.
	CreateGroup(ctx context.Context, inp variableCore.GroupCreateInput, organizationID, userID string) (*variableCore.Group, error)

	// UpdateGroup should rename and/or recolour a group.
	UpdateGroup(ctx context.Context, id xid.ID, inp variableCore.GroupUpdateInput, organizationID string) error

	// MoveGroup should move a group to another position.
	MoveGroup(ctx context.Context, inp variableCore.GroupMoveInput, organizationID string) error

	// DeleteGroup should delete an empty group.
	DeleteGroup(ctx context.Context, id xid.ID, organizationID string) error
}
