import Link from "next/link";

export default function NotFound() {
	return (
		<div className='site-container'>
			<div className='detail-panel'>
				<h1>Page Not Found</h1>
				<p>The requested page could not be found.</p>
				<Link href='/'>Return Home</Link>
			</div>
		</div>
	);
}

