"use client";

import { Suspense, lazy } from "react";

const WebVitalsReporter = lazy(() => import("./WebVitalsReporter"));
const AnalyticsScripts = lazy(() => import("../tracking/AnalyticsScripts"));

export default function ClientTelemetry() {
	return (
		<Suspense fallback={null}>
			<AnalyticsScripts />
			<WebVitalsReporter />
		</Suspense>
	);
}
