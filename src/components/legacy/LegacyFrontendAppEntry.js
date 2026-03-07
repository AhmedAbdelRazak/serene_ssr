"use client";

import dynamic from "next/dynamic";

const LegacyFrontendApp = dynamic(() => import("./LegacyFrontendApp"), {
	ssr: false,
	loading: () => <div style={{ minHeight: "40vh" }} />,
});

export default function LegacyFrontendAppEntry() {
	return <LegacyFrontendApp />;
}
