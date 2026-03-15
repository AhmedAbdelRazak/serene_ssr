"use client";

import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import isPropValid from "@emotion/is-prop-valid";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

function shouldForwardProp(propName, target) {
	if (typeof target === "string") return isPropValid(propName);
	return true;
}

export default function StyledComponentsRegistry({ children }) {
	const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

	useServerInsertedHTML(() => {
		const styles = styledComponentsStyleSheet.getStyleElement();
		styledComponentsStyleSheet.instance.clearTag();
		return <>{styles}</>;
	});

	if (typeof window !== "undefined") {
		return <>{children}</>;
	}

	return (
		<StyleSheetManager
			sheet={styledComponentsStyleSheet.instance}
			shouldForwardProp={shouldForwardProp}
		>
			{children}
		</StyleSheetManager>
	);
}
