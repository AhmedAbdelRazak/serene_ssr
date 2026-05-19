function normalizeHeadingId(value = "") {
	return `${value || "section"}`
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

export default function SeoCrawlSupport({
	title = "Serene Jannat",
	description = "",
	paragraphs = [],
	links = [],
	headingLevel = 1,
	compact = false,
	visuallyHidden = true,
}) {
	const safeTitle = `${title || "Serene Jannat"}`.trim();
	const headingId = `seo-${normalizeHeadingId(safeTitle)}`;
	const safeParagraphs = [
		description,
		...(Array.isArray(paragraphs) ? paragraphs : []),
	].filter((entry) => `${entry || ""}`.trim());
	const safeLinks = (Array.isArray(links) ? links : [])
		.map((link) => ({
			href: `${link?.href || ""}`.trim(),
			label: `${link?.label || ""}`.trim(),
		}))
		.filter((link) => link.href && link.label)
		.slice(0, 36);
	const HeadingTag = headingLevel === 2 ? "h2" : "h1";

	return (
		<section
			className={`seo-crawl-support${compact ? " seo-crawl-support--compact" : ""}${
				visuallyHidden ? " seo-crawl-support--visually-hidden" : ""
			}`}
			aria-labelledby={visuallyHidden ? undefined : headingId}
			aria-hidden={visuallyHidden ? "true" : undefined}
		>
			<div className='site-container seo-crawl-support__inner'>
				<HeadingTag id={headingId}>{safeTitle}</HeadingTag>
				{safeParagraphs.map((paragraph, index) => (
					<p key={`${headingId}-p-${index}`}>{paragraph}</p>
				))}
				{safeLinks.length ? (
					<nav aria-label={`${safeTitle} helpful links`}>
						<ul>
							{safeLinks.map((link) => (
								<li key={`${link.href}-${link.label}`}>
									<a href={link.href} tabIndex={visuallyHidden ? -1 : undefined}>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				) : null}
			</div>
		</section>
	);
}
