package approval

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/allan/ecoinventario/internal/shared"
)

const QueueChangedEvent = "approval_queue_changed"

type QueueEvent struct {
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id"`
	Status     string    `json:"status"`
	Action     string    `json:"action"`
	OccurredAt time.Time `json:"occurred_at"`
}

type Notifier interface {
	NotifyApprovalQueueChanged(ctx context.Context, event QueueEvent)
}

type Broker struct {
	mu          sync.Mutex
	subscribers map[string]map[chan QueueEvent]struct{}
}

func NewBroker() *Broker {
	return &Broker{subscribers: make(map[string]map[chan QueueEvent]struct{})}
}

func (b *Broker) NotifyApprovalQueueChanged(ctx context.Context, event QueueEvent) {
	orgID := shared.GetOrgID(ctx)
	if orgID == "" {
		return
	}
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.subscribers[orgID] {
		select {
		case ch <- event:
		default:
		}
	}
}

func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	orgID := shared.GetOrgID(r.Context())
	if orgID == "" {
		http.Error(w, "organization not found", http.StatusUnauthorized)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch := make(chan QueueEvent, 16)
	b.subscribe(orgID, ch)
	defer b.unsubscribe(orgID, ch)

	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case event := <-ch:
			data, err := json.Marshal(event)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "event: %s\n", QueueChangedEvent)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		case <-heartbeat.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

func (b *Broker) subscribe(orgID string, ch chan QueueEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.subscribers[orgID] == nil {
		b.subscribers[orgID] = make(map[chan QueueEvent]struct{})
	}
	b.subscribers[orgID][ch] = struct{}{}
}

func (b *Broker) unsubscribe(orgID string, ch chan QueueEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.subscribers[orgID], ch)
	close(ch)
	if len(b.subscribers[orgID]) == 0 {
		delete(b.subscribers, orgID)
	}
}
