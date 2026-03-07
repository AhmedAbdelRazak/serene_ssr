"use client";

import Image from "next/image";
import Link from "next/link";
import { trackConversionEvent } from "@/lib/tracking-client";

export default function ProductCard({
	productId,
	title,
	priceText,
	href,
	imageUrl,
	isPod = false,
}) {
	const safeImage = imageUrl || "/logo512.png";

	const handleClick = () => {
		trackConversionEvent({
			eventName: "Lead",
			contentIds: [productId],
			value: 0,
			extra: {
				content_name: title,
				click_type: isPod ? "PrintOnDemand Product Clicked" : "Product Clicked",
			},
		});
	};

	return (
		<Link href={href} className='product-card' onClick={handleClick}>
			<div className='product-media'>
				<Image
					src={safeImage}
					alt={title}
					fill
					sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw'
					style={{ objectFit: "contain" }}
				/>
				{isPod ? <span className='pod-badge'>Custom Design</span> : null}
			</div>
			<div className='product-content'>
				<h3>{title}</h3>
				<p>{priceText}</p>
			</div>
		</Link>
	);
}
