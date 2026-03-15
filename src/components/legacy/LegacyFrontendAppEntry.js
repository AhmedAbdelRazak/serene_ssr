"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

function formatPrice(value) {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue) || numericValue <= 0) return "";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(numericValue);
}

function HeaderShell() {
	return (
		<header
			style={{
				position: "sticky",
				top: 0,
				zIndex: 20,
				background: "#ffffff",
				borderBottom: "1px solid #e8ddd2",
				boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
			}}
		>
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "12px 16px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<div
					style={{
						width: 28,
						height: 28,
						borderRadius: 8,
						background: "#efe4da",
					}}
				/>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						minWidth: 0,
						flex: 1,
						justifyContent: "center",
					}}
				>
					<img
						src='/logo192.png'
						alt='Serene Jannat'
						style={{
							width: 42,
							height: 42,
							borderRadius: 10,
							objectFit: "cover",
							border: "1px solid #d8cdc1",
						}}
					/>
					<div style={{ minWidth: 0 }}>
						<div
							style={{
								fontSize: 22,
								lineHeight: 1.05,
								fontWeight: 600,
								color: "#27211d",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							Serene Jannat
						</div>
						<div
							style={{
								fontSize: 12,
								color: "#7a7068",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							Harmonious Glow, Natural Bliss
						</div>
					</div>
				</div>
				<div
					style={{
						width: 28,
						height: 28,
						borderRadius: 8,
						background: "#efe4da",
					}}
				/>
			</div>
		</header>
	);
}

function PodProductFallback({ initialRouteData }) {
	const title = initialRouteData?.title || "Loading custom gift";
	const priceLabel = formatPrice(initialRouteData?.price);
	const imageUrl = initialRouteData?.image || "";
	const selectionTokens = [
		initialRouteData?.selection?.occasion,
		initialRouteData?.selection?.color,
		initialRouteData?.selection?.size,
		initialRouteData?.selection?.scent,
	].filter(Boolean);

	return (
		<main
			role='main'
			aria-busy='true'
			style={{
				minHeight: "100vh",
				background: "#f7f3ee",
			}}
		>
			<HeaderShell />
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "18px 16px 28px",
				}}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: 24,
						alignItems: "start",
					}}
				>
					<section
						style={{
							display: "grid",
							gap: 16,
						}}
					>
						<div
							style={{
								background: "linear-gradient(180deg, #fffaf6 0%, #ffffff 100%)",
								border: "1px solid #ece0d6",
								borderRadius: 18,
								padding: 16,
								boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
							}}
						>
							<div
								style={{
									height: 46,
									borderRadius: 12,
									background: "#f4ede7",
									marginBottom: 10,
								}}
							/>
							<div
								style={{
									height: 46,
									borderRadius: 12,
									background: "#f4ede7",
									marginBottom: 14,
								}}
							/>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
									gap: 10,
								}}
							>
								<div
									style={{
										height: 44,
										borderRadius: 12,
										background: "#2f75ec",
									}}
								/>
								<div
									style={{
										height: 44,
										borderRadius: 12,
										background: "#f4ede7",
									}}
								/>
							</div>
						</div>
						<div
							style={{
								background: "#ffffff",
								border: "1px solid #ece0d6",
								borderRadius: 20,
								padding: 18,
								boxShadow: "0 16px 30px rgba(0, 0, 0, 0.07)",
								minHeight: 540,
								display: "grid",
								placeItems: "center",
							}}
						>
							{imageUrl ? (
								<img
									src={imageUrl}
									alt={title}
									style={{
										maxWidth: "100%",
										maxHeight: 500,
										objectFit: "contain",
									}}
								/>
							) : (
								<div
									style={{
										width: "100%",
										height: 500,
										borderRadius: 18,
										background:
											"linear-gradient(135deg, #ede7e0 0%, #f8f5f1 100%)",
									}}
								/>
							)}
						</div>
					</section>

					<section
						style={{
							display: "grid",
							gap: 16,
						}}
					>
						<div
							style={{
								background: "#ffffff",
								border: "1px solid #ece0d6",
								borderRadius: 18,
								padding: 18,
								boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
							}}
						>
							<div
								style={{
									fontSize: 28,
									lineHeight: 1.15,
									fontWeight: 700,
									color: "#231f1b",
									marginBottom: 10,
								}}
							>
								{title}
							</div>
							{priceLabel ? (
								<div
									style={{
										fontSize: 24,
										fontWeight: 700,
										color: "#463a31",
										marginBottom: 12,
									}}
								>
									Price: {priceLabel}
								</div>
							) : null}
							{selectionTokens.length ? (
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: 8,
									}}
								>
									{selectionTokens.map((token) => (
										<span
											key={token}
											style={{
												padding: "8px 12px",
												borderRadius: 999,
												background: "#f7efe8",
												border: "1px solid #ead8ca",
												fontSize: 13,
												color: "#5d4d40",
											}}
										>
											{token}
										</span>
									))}
								</div>
							) : null}
						</div>

						<div
							style={{
								background: "#ffffff",
								border: "1px solid #ece0d6",
								borderRadius: 18,
								padding: 18,
								boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
								display: "grid",
								gap: 12,
							}}
						>
							<div
								style={{
									height: 28,
									width: "55%",
									borderRadius: 10,
									background: "#f4ede7",
								}}
							/>
							<div
								style={{
									height: 64,
									borderRadius: 16,
									background: "#f8f2eb",
									border: "1px solid #ece0d6",
								}}
							/>
							<div
								style={{
									height: 180,
									borderRadius: 16,
									background:
										"linear-gradient(135deg, #f4efe9 0%, #fbf8f4 100%)",
									border: "1px solid #ece0d6",
								}}
							/>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}

function GenericFallback() {
	return (
		<main
			role='main'
			aria-busy='true'
			style={{
				minHeight: "100vh",
				background: "#f7f3ee",
			}}
		>
			<HeaderShell />
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "18px 16px 28px",
				}}
			>
				<div
					style={{
						display: "grid",
						gap: 16,
					}}
				>
					<div
						style={{
							height: 180,
							borderRadius: 22,
							background: "linear-gradient(135deg, #efe8df 0%, #fbf8f4 100%)",
							border: "1px solid #ece0d6",
						}}
					/>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
							gap: 16,
						}}
					>
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={index}
								style={{
									height: 240,
									borderRadius: 18,
									background: "#ffffff",
									border: "1px solid #ece0d6",
									boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
								}}
							/>
						))}
					</div>
				</div>
			</div>
		</main>
	);
}

function LegacyShellFallback({ initialRouteData = null }) {
	if (initialRouteData?.type === "pod-product") {
		return <PodProductFallback initialRouteData={initialRouteData} />;
	}
	return <GenericFallback />;
}

export default function LegacyFrontendAppEntry({
	initialRouteData = null,
}) {
	const LegacyFrontendApp = useMemo(
		() =>
			dynamic(() => import("./LegacyFrontendApp"), {
				ssr: false,
				loading: () => (
					<LegacyShellFallback initialRouteData={initialRouteData} />
				),
			}),
		[initialRouteData]
	);

	return <LegacyFrontendApp initialRouteData={initialRouteData} />;
}
