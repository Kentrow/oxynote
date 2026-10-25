package variable

import (
	"context"

	"github.com/guregu/null/v5"
	"github.com/oxynote/oxynote/server/core/internal/server/internal/auth"
	"github.com/oxynote/oxynote/server/core/pkg/httpserver"
	"github.com/oxynote/wetsocks/wsserver"
)

// ChangeMessage represents a change in an organization's variables or in
// one user's own values. The tree is small and always fetched whole, so
// the message carries no payload: it tells a subscriber to refetch.
type ChangeMessage struct{}

// BindChange binds a variables change event to the given topic.
func (h *Handler) BindChange(tpc wsserver.Topic) {
	h.changeCallback = func(organizationID string, userID null.String) {
		ctx, cancel := context.WithTimeout(context.Background(), httpserver.WSPublishTimeout)
		defer cancel()

		filter := auth.FilterOrganization(organizationID)
		if userID.Valid {
			filter = auth.FilterUser(organizationID, userID.String)
		}

		tpc.PublishMany(ctx, ChangeMessage{}, filter)
	}
}

// NotifyChange announces a change to the organization's subscribers: all
// of them for a change of its variables, or only the user's own when the
// change is one user's value. Safe to call before BindChange has been
// invoked: no subscribers means it is a no-op.
func (h *Handler) NotifyChange(organizationID string, userID null.String) {
	if h.changeCallback == nil {
		return
	}

	h.changeCallback(organizationID, userID)
}
