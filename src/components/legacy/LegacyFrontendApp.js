"use client";

import "@ant-design/v5-patch-for-react-19";
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HelmetProvider } from "react-helmet-async";
import { StyleSheetManager } from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import { CartProvider } from "@/legacy_frontend/cart_context";

const LegacyApp = dynamic(() => import("@/legacy_frontend/App"), {
	ssr: false,
	loading: () => <div style={{ minHeight: "40vh" }} />,
});

export default function LegacyFrontendApp() {
	const clientId =
		process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
		process.env.REACT_APP_GOOGLE_CLIENT_ID ||
		"";
	const requiresGoogleProvider = useMemo(() => {
		if (typeof window === "undefined") return true;
		const path = `${window.location.pathname || ""}`.toLowerCase();
		return (
			path.startsWith("/signin") ||
			path.startsWith("/signup") ||
			path.startsWith("/sellingagent/signup")
		);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (window.__serenePatchedJsonParser) return;

		const originalJson = Response.prototype.json;
		Response.prototype.json = async function patchedJson(...args) {
			let backupResponse = null;
			if (!this?.bodyUsed && typeof this?.clone === "function") {
				try {
					backupResponse = this.clone();
				} catch {
					backupResponse = null;
				}
			}
			try {
				return await originalJson.apply(this, args);
			} catch (error) {
				const fallbackText =
					(await backupResponse?.text?.().catch(() => "")) || "";
				if (!backupResponse) {
					return {
						error: "Failed to parse JSON response",
						details: error?.message || "Unknown parsing error",
						url: this?.url || "",
						status: this?.status || 0,
					};
				}
				const isHtmlPayload = /^\s*</.test(fallbackText);
				if (!isHtmlPayload) {
					try {
						return JSON.parse(fallbackText);
					} catch {
						throw error;
					}
				}

				console.error("Non-JSON response received from API:", {
					url: this?.url || "",
					status: this?.status || 0,
					contentType: this?.headers?.get?.("content-type") || "",
				});

				return {
					error: "Expected JSON response but received HTML",
					url: this?.url || "",
					status: this?.status || 0,
				};
			}
		};

		window.__serenePatchedJsonParser = true;
	}, []);

	const shouldForwardProp = (propName, target) => {
		if (typeof target === "string") return isPropValid(propName);
		return true;
	};

	return (
		<StyleSheetManager shouldForwardProp={shouldForwardProp}>
			<HelmetProvider>
				<CartProvider>
					{requiresGoogleProvider ? (
						<GoogleOAuthProvider clientId={clientId}>
							<LegacyApp />
						</GoogleOAuthProvider>
					) : (
						<LegacyApp />
					)}
				</CartProvider>
			</HelmetProvider>
		</StyleSheetManager>
	);
}
