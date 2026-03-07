import Link from "next/link";

export default function LegacyRouteNotice({ title, path }) {
	return (
		<div className='site-container legacy-wrap'>
			<h1>{title}</h1>
			<p>
				This route is available and indexed strategy is configured. Full interactive
				parity is being migrated to Next.js with zero-loss behavior.
			</p>
			<p>
				Current path: <code>{path}</code>
			</p>
			<p>
				<Link href='/'>Go back home</Link>
			</p>
		</div>
	);
}

