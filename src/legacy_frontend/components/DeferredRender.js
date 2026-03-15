"use client";

import { useEffect, useRef, useState } from "react";

export default function DeferredRender({
	children,
	placeholder = null,
	rootMargin = "320px 0px",
}) {
	const [shouldRender, setShouldRender] = useState(false);
	const triggerRef = useRef(null);

	useEffect(() => {
		if (shouldRender) return undefined;
		if (typeof window === "undefined") return undefined;
		if (!("IntersectionObserver" in window)) {
			setShouldRender(true);
			return undefined;
		}

		const target = triggerRef.current;
		if (!target) {
			setShouldRender(true);
			return undefined;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setShouldRender(true);
					observer.disconnect();
				}
			},
			{ rootMargin }
		);

		observer.observe(target);
		return () => {
			observer.disconnect();
		};
	}, [rootMargin, shouldRender]);

	return <div ref={triggerRef}>{shouldRender ? children : placeholder}</div>;
}
