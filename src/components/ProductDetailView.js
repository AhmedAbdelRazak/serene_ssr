"use client";

import Image from "next/image";
import { trackConversionEvent } from "@/lib/tracking-client";

export default function ProductDetailView({
	productId,
	title,
	description,
	price,
	imageUrl,
	metaChips = [],
}) {
	const safeImage = imageUrl || "/logo512.png";

	return (
		<div className='detail-layout'>
			<div className='detail-image-wrap'>
				<Image
					src={safeImage}
					alt={title}
					fill
					priority
					sizes='(max-width: 980px) 100vw, 50vw'
					style={{ objectFit: "contain" }}
				/>
			</div>
			<div className='detail-panel'>
				<h1>{title}</h1>
				<p>{description}</p>
				{metaChips.length ? (
					<div className='meta-row'>
						{metaChips.map((chip) => (
							<span className='meta-chip' key={chip}>
								{chip}
							</span>
						))}
					</div>
				) : null}
				<div className='detail-price'>${Number(price || 0).toFixed(2)}</div>
				<div className='btn-row'>
					<button
						type='button'
						onClick={() =>
							trackConversionEvent({
								eventName: "PreviewDesign",
								contentIds: [productId],
								value: Number(price || 0),
							})
						}
					>
						Preview Design
					</button>
					<button
						type='button'
						className='btn-primary'
						onClick={() =>
							trackConversionEvent({
								eventName: "AddToCart",
								contentIds: [productId],
								value: Number(price || 0),
							})
						}
					>
						Add to Cart
					</button>
				</div>
			</div>
		</div>
	);
}
