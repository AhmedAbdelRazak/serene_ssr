"use client";

import dynamic from "next/dynamic";

function LegacyShellFallback() {
	return (
		<main
			role='main'
			aria-busy='true'
			style={{ width: "100%", minHeight: "2300px", background: "#f4f4f4" }}
		>
			<div style={{ height: 70, background: "#ffffff" }} />
			<div style={{ height: 60, background: "#5d5b59" }} />
			<div
				style={{
					height: "52vw",
					maxHeight: 700,
					minHeight: 260,
					background: "linear-gradient(90deg, #e8e8e8 25%, #dddddd 37%, #e8e8e8 63%)",
					backgroundSize: "400% 100%",
				}}
			/>
		</main>
	);
}

const LegacyFrontendApp = dynamic(() => import("./LegacyFrontendApp"), {
	ssr: false,
	loading: () => <LegacyShellFallback />,
});

export default function LegacyFrontendAppEntry() {
	return <LegacyFrontendApp />;
}
