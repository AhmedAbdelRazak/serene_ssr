export default function StaticContentPage({ title, description, children }) {
	return (
		<div className='site-container'>
			<div className='detail-panel'>
				<h1>{title}</h1>
				<p>{description}</p>
				<div>{children}</div>
			</div>
		</div>
	);
}

