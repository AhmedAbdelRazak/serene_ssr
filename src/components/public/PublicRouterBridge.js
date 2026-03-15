"use client";

import { useEffect, useRef } from "react";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function buildFullPath(pathname, searchParams) {
	const search = searchParams?.toString() || "";
	return `${pathname || "/"}${search ? `?${search}` : ""}`;
}

export default function PublicRouterBridge({ children }) {
	const nextRouter = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const fullPath = buildFullPath(pathname, searchParams);
	const historyRef = useRef(null);
	const syncingRef = useRef(false);
	const currentPathRef = useRef(fullPath);

	if (!historyRef.current) {
		historyRef.current = createMemoryHistory({
			initialEntries: [fullPath],
		});
	}

	useEffect(() => {
		currentPathRef.current = fullPath;
		const history = historyRef.current;
		const historyPath = `${history.location.pathname || "/"}${
			history.location.search || ""
		}${history.location.hash || ""}`;
		if (historyPath === fullPath) return;
		syncingRef.current = true;
		history.replace(fullPath);
		queueMicrotask(() => {
			syncingRef.current = false;
		});
	}, [fullPath]);

	useEffect(() => {
		const history = historyRef.current;
		const unlisten = history.listen((location, action) => {
			if (syncingRef.current) return;
			const targetPath = `${location.pathname || "/"}${location.search || ""}${
				location.hash || ""
			}`;
			if (!targetPath || targetPath === currentPathRef.current) return;
			if (action === "REPLACE") {
				nextRouter.replace(targetPath);
				return;
			}
			nextRouter.push(targetPath);
		});

		return () => {
			unlisten();
		};
	}, [nextRouter]);

	return <Router history={historyRef.current}>{children}</Router>;
}
