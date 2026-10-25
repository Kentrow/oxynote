package document

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func Test_MetricTimeRanges(t *testing.T) {
	t.Parallel()

	ranges := MetricTimeRanges()
	assert.Len(t, ranges, 28)
	assert.Contains(t, ranges, "last_24_hours")

	// the result is a copy, so a caller cannot change the presets.
	ranges[0] = "changed"

	assert.Equal(t, "last_5_minutes", MetricTimeRanges()[0])
}

func Test_MetricRefreshIntervals(t *testing.T) {
	t.Parallel()

	intervals := MetricRefreshIntervals()
	assert.Equal(t, []string{"5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"}, intervals)

	// the result is a copy, so a caller cannot change the intervals.
	intervals[0] = "changed"

	assert.Equal(t, "5s", MetricRefreshIntervals()[0])
}
