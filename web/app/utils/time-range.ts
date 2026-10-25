// the time ranges a metric chart or a time range variable can show,
// grouped as the pickers list them
export enum TimeRangePreset {
	// Quick / relative
	Last5Minutes = "last_5_minutes",
	Last15Minutes = "last_15_minutes",
	Last30Minutes = "last_30_minutes",
	Last1Hour = "last_1_hour",
	Last3Hours = "last_3_hours",
	Last6Hours = "last_6_hours",
	Last12Hours = "last_12_hours",
	Last24Hours = "last_24_hours",
	Last2Days = "last_2_days",
	Last7Days = "last_7_days",
	Last30Days = "last_30_days",
	Last90Days = "last_90_days",
	Last6Months = "last_6_months",
	Last1Year = "last_1_year",
	Last2Years = "last_2_years",
	Last5Years = "last_5_years",

	// Calendar-aligned ("This")
	Today = "today",
	Yesterday = "yesterday",
	TodaySoFar = "today_so_far",
	ThisWeek = "this_week",
	ThisWeekSoFar = "this_week_so_far",
	ThisMonth = "this_month",
	ThisMonthSoFar = "this_month_so_far",
	ThisYear = "this_year",
	ThisYearSoFar = "this_year_so_far",

	// Previous periods
	PreviousWeek = "previous_week",
	PreviousMonth = "previous_month",
	PreviousYear = "previous_year",
}

// the intervals a metric chart refreshes at, shortest first
export enum RefreshInterval {
	S5 = "5s",
	S10 = "10s",
	S30 = "30s",
	M1 = "1m",
	M5 = "5m",
	M15 = "15m",
	M30 = "30m",
	H1 = "1h",
	H2 = "2h",
	D1 = "1d",
}
