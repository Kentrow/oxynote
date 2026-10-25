package document

import "slices"

var (
	// _metricTimeRanges is every time range preset a metric block takes.
	_metricTimeRanges = []string{
		"last_5_minutes", "last_15_minutes", "last_30_minutes",
		"last_1_hour", "last_3_hours", "last_6_hours", "last_12_hours", "last_24_hours",
		"last_2_days", "last_7_days", "last_30_days", "last_90_days",
		"last_6_months", "last_1_year", "last_2_years", "last_5_years",
		"today", "yesterday", "today_so_far",
		"this_week", "this_week_so_far", "this_month", "this_month_so_far",
		"this_year", "this_year_so_far",
		"previous_week", "previous_month", "previous_year",
	}

	// _metricRefreshIntervals is every interval a metric block refreshes
	// at, shortest first.
	_metricRefreshIntervals = []string{"5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"}
)

// MetricTimeRanges returns every time range preset a metric block takes.
func MetricTimeRanges() []string {
	return slices.Clone(_metricTimeRanges)
}

// MetricRefreshIntervals returns every interval a metric block refreshes
// at, shortest first.
func MetricRefreshIntervals() []string {
	return slices.Clone(_metricRefreshIntervals)
}
