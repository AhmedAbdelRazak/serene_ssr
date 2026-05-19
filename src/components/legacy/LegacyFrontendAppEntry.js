"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { getPrimaryProductImage } from "@/lib/product-helpers";
import { getCloudinaryOptimizedUrl } from "@/legacy_frontend/utils/image";

const routeModulePreloaders = {
	home: () => import("@/legacy_frontend/pages/Home/Home"),
	"pod-product": () =>
		import("@/legacy_frontend/pages/PrintOnDemand/CustomizeSelectedProduct"),
	"pod-list": () =>
		import("@/legacy_frontend/pages/PrintOnDemand/PrintifyAvailableProducts"),
	"shop-list": () => import("@/legacy_frontend/pages/ShopPage/ShopPageMain"),
	"standard-product": () =>
		import("@/legacy_frontend/pages/SingleProduct/SingleProductMain"),
};

const preloadedRouteTypes = new Set();

function preloadRouteModule(routeType = "") {
	if (!routeType || preloadedRouteTypes.has(routeType)) return;
	const preload = routeModulePreloaders[routeType];
	if (typeof preload !== "function") return;
	preloadedRouteTypes.add(routeType);
	Promise.resolve(preload()).catch(() => {
		preloadedRouteTypes.delete(routeType);
	});
}

function formatPrice(value) {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue) || numericValue <= 0) return "";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(numericValue);
}

function toSlugSegment(value = "") {
	return `${value || ""}`
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

function getRawProductTitle(product = {}) {
	return (
		product?.productName || product?.title || product?.printifyProductDetails?.title || "Product"
	);
}

function getRawProductImage(product = {}) {
	return getPrimaryProductImage(product);
}

function getRawProductPrice(product = {}) {
	const attribute = Array.isArray(product?.productAttributes)
		? product.productAttributes[0]
		: null;
	const priceCandidate =
		Number(attribute?.priceAfterDiscount || 0) ||
		Number(product?.priceAfterDiscount || 0) ||
		Number(attribute?.price || 0) ||
		Number(product?.price || 0);
	return Number.isFinite(priceCandidate) ? priceCandidate : 0;
}

function getRawProductHref(product = {}) {
	const productId = `${product?._id || ""}`.trim();
	if (!productId) return "";
	const isPod = Boolean(product?.printifyProductDetails?.POD);
	const slug = `${product?.slug || ""}`.trim() || toSlugSegment(getRawProductTitle(product));
	if (isPod) return `/custom-gifts/${slug || "custom-gift"}/${productId}`;
	const categorySlug = `${product?.category?.categorySlug || product?.categorySlug || "all"}`.trim();
	return `/single-product/${slug || "product"}/${categorySlug || "all"}/${productId}`;
}

function createCardModel(product = {}) {
	return {
		productId: `${product?._id || ""}`.trim(),
		title: getRawProductTitle(product),
		priceText: formatPrice(getRawProductPrice(product)),
		href: getRawProductHref(product),
		imageUrl: getRawProductImage(product),
		isPod: Boolean(product?.printifyProductDetails?.POD),
	};
}

function SeoProductGrid({ cards = [] }) {
	if (!cards.length) return null;
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
				gap: 16,
				marginTop: 18,
			}}
		>
			{cards.map((card) => (
				<ProductCard
					key={card?.productId || card?.href || card?.title}
					productId={card?.productId}
					title={card?.title}
					priceText={card?.priceText || ""}
					href={card?.href || "#"}
					imageUrl={card?.imageUrl || ""}
					isPod={Boolean(card?.isPod)}
				/>
			))}
		</div>
	);
}

function HeaderShell({ logoUrl = "/logo192.png" }) {
	const optimizedLogoUrl = getCloudinaryOptimizedUrl(logoUrl, {
		width: 96,
		quality: "auto:eco",
	});

	return (
		<header
			style={{
				position: "sticky",
				top: 0,
				zIndex: 20,
				background: "#ffffff",
				borderBottom: "1px solid #e8ddd2",
				boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
			}}
		>
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "12px 16px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<div
					style={{
						width: 28,
						height: 28,
						borderRadius: 8,
						background: "#efe4da",
					}}
				/>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						minWidth: 0,
						flex: 1,
						justifyContent: "center",
					}}
				>
					<img
						src={optimizedLogoUrl || logoUrl}
						alt='Serene Jannat'
						style={{
							width: 42,
							height: 42,
							borderRadius: 10,
							objectFit: "cover",
							border: "1px solid #d8cdc1",
						}}
					/>
					<div style={{ minWidth: 0 }}>
						<div
							style={{
								fontSize: 22,
								lineHeight: 1.05,
								fontWeight: 600,
								color: "#27211d",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							Serene Jannat
						</div>
						<div
							style={{
								fontSize: 12,
								color: "#7a7068",
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							Harmonious Glow, Natural Bliss
						</div>
					</div>
				</div>
				<div
					style={{
						width: 28,
						height: 28,
						borderRadius: 8,
						background: "#efe4da",
					}}
				/>
			</div>
		</header>
	);
}

function HomeFallback({ initialRouteData }) {
	const websiteSetup = initialRouteData?.websiteSetup || null;
	const heroBanner = websiteSetup?.homeMainBanners?.[0] || null;
	const logoUrl =
		websiteSetup?.sereneJannatLogo?.cloudinary_url ||
		websiteSetup?.sereneJannatLogo?.cloudinaryUrl ||
		websiteSetup?.sereneJannatLogo?.url ||
		initialRouteData?.logoUrl ||
		"/logo192.png";
	const categories = Array.isArray(initialRouteData?.categories)
		? initialRouteData.categories
		: [];
	const featuredProducts = Array.isArray(initialRouteData?.featuredProducts)
		? initialRouteData.featuredProducts
		: [];
	const newArrivalProducts = Array.isArray(initialRouteData?.newArrivalProducts)
		? initialRouteData.newArrivalProducts
		: [];
	const customDesignProducts = Array.isArray(initialRouteData?.customDesignProducts)
		? initialRouteData.customDesignProducts
		: [];
	const homeCards = [
		...featuredProducts,
		...customDesignProducts,
		...newArrivalProducts,
	].filter(Boolean).slice(0, 6);
	const homeCardModels = homeCards.map(createCardModel).filter((card) => card.href);

	return (
		<main
			role='main'
			aria-busy='true'
			style={{
				minHeight: "100vh",
				background: "#f7f3ee",
			}}
		>
			<HeaderShell logoUrl={logoUrl} />
			<div
				style={{
					maxWidth: 1360,
					margin: "0 auto",
					padding: "18px 16px 30px",
				}}
			>
				<section
					style={{
						position: "relative",
						minHeight: "clamp(260px, 52vw, 700px)",
						borderRadius: 18,
						overflow: "hidden",
						background:
							"linear-gradient(135deg, #58504a 0%, #8b765f 45%, #d7bda2 100%)",
						boxShadow: "0 18px 32px rgba(0, 0, 0, 0.12)",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							background:
								"linear-gradient(90deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0.1) 100%)",
						}}
					/>
					<div
						style={{
							position: "relative",
							padding: "clamp(22px, 5vw, 42px)",
							maxWidth: 720,
							color: "#ffffff",
						}}
					>
						<div
							style={{
								fontSize: "clamp(2rem, 6vw, 4.8rem)",
								lineHeight: 1,
								fontWeight: 600,
								marginBottom: 10,
								fontFamily: '"Allison", cursive',
							}}
						>
							{heroBanner?.title || "Serene Jannat gifts"}
						</div>
						<div
							style={{
								fontSize: "clamp(0.98rem, 2vw, 1.25rem)",
								lineHeight: 1.5,
								maxWidth: 560,
							}}
						>
							{heroBanner?.subTitle ||
								"Handpicked decor, custom gifts, and premium print-on-demand products."}
						</div>
					</div>
				</section>

				{categories.length ? (
					<section
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
							gap: 12,
							marginTop: 18,
						}}
					>
						{categories.slice(0, 6).map((category) => (
							<div
								key={category?._id || category?.categorySlug || category?.categoryName}
								style={{
									background: "#ffffff",
									border: "1px solid #ece0d6",
									borderRadius: 16,
									padding: "14px 12px",
									boxShadow: "0 10px 22px rgba(0, 0, 0, 0.05)",
									textAlign: "center",
									fontWeight: 600,
									color: "#3f332b",
								}}
							>
								{category?.categoryName || "Category"}
							</div>
						))}
					</section>
				) : null}

					<section style={{ marginTop: 22 }}>
						<h2
							style={{
								margin: 0,
								fontSize: "clamp(1.2rem, 2vw, 1.8rem)",
								color: "#2c241f",
							}}
						>
							Popular picks
						</h2>
						<p
							style={{
								margin: "8px 0 0",
								color: "#6a5d53",
								lineHeight: 1.5,
							}}
						>
							Shop featured products, recent arrivals, and custom gifts from the
							server-rendered storefront.
						</p>
						{homeCardModels.length ? (
							<SeoProductGrid cards={homeCardModels} />
						) : (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
									gap: 16,
									marginTop: 18,
								}}
							>
								{Array.from({ length: 6 }).map((_, index) => (
									<div
										key={index}
										style={{
											height: 260,
											borderRadius: 18,
											background: "#ffffff",
											border: "1px solid #ece0d6",
											boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
										}}
									/>
								))}
							</div>
						)}
					</section>
				</div>
			</main>
		);
}

function PodProductFallback({ initialRouteData }) {
	const title = initialRouteData?.title || "Loading custom gift";
	const priceLabel = formatPrice(initialRouteData?.price);
	const imageUrl = initialRouteData?.image || "";
	const selectionTokens = [
		initialRouteData?.selection?.occasion,
		initialRouteData?.selection?.color,
		initialRouteData?.selection?.size,
		initialRouteData?.selection?.scent,
	].filter(Boolean);

	return (
		<main
			role='main'
			aria-busy='true'
			style={{
				minHeight: "100vh",
				background: "#f7f3ee",
			}}
		>
			<HeaderShell logoUrl='/logo192.png' />
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "18px 16px 28px",
				}}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: 24,
						alignItems: "start",
					}}
				>
					<section
						style={{
							display: "grid",
							gap: 16,
						}}
					>
						<div
							style={{
								background: "linear-gradient(180deg, #fffaf6 0%, #ffffff 100%)",
								border: "1px solid #ece0d6",
								borderRadius: 18,
								padding: 16,
								boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
							}}
						>
							<div
								style={{
									height: 46,
									borderRadius: 12,
									background: "#f4ede7",
									marginBottom: 10,
								}}
							/>
							<div
								style={{
									height: 46,
									borderRadius: 12,
									background: "#f4ede7",
									marginBottom: 14,
								}}
							/>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
									gap: 10,
								}}
							>
								<div
									style={{
										height: 44,
										borderRadius: 12,
										background: "#2f75ec",
									}}
								/>
								<div
									style={{
										height: 44,
										borderRadius: 12,
										background: "#f4ede7",
									}}
								/>
							</div>
						</div>
						<div
							style={{
								background: "#ffffff",
								border: "1px solid #ece0d6",
								borderRadius: 20,
								padding: 18,
								boxShadow: "0 16px 30px rgba(0, 0, 0, 0.07)",
								minHeight: 540,
								display: "grid",
								placeItems: "center",
							}}
						>
							{imageUrl ? (
								<img
									src={imageUrl}
									alt={title}
									style={{
										maxWidth: "100%",
										maxHeight: 500,
										objectFit: "contain",
									}}
								/>
							) : (
								<div
									style={{
										width: "100%",
										height: 500,
										borderRadius: 18,
										background:
											"linear-gradient(135deg, #ede7e0 0%, #f8f5f1 100%)",
									}}
								/>
							)}
						</div>
					</section>

					<section
						style={{
							display: "grid",
							gap: 16,
						}}
					>
						<div
							style={{
								background: "#ffffff",
								border: "1px solid #ece0d6",
								borderRadius: 18,
								padding: 18,
								boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
							}}
						>
							<div
								style={{
									fontSize: 28,
									lineHeight: 1.15,
									fontWeight: 700,
									color: "#231f1b",
									marginBottom: 10,
								}}
							>
								{title}
							</div>
							{priceLabel ? (
								<div
									style={{
										fontSize: 24,
										fontWeight: 700,
										color: "#463a31",
										marginBottom: 12,
									}}
								>
									Price: {priceLabel}
								</div>
							) : null}
							{selectionTokens.length ? (
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: 8,
									}}
								>
									{selectionTokens.map((token) => (
										<span
											key={token}
											style={{
												padding: "8px 12px",
												borderRadius: 999,
												background: "#f7efe8",
												border: "1px solid #ead8ca",
												fontSize: 13,
												color: "#5d4d40",
											}}
										>
											{token}
										</span>
									))}
								</div>
							) : null}
						</div>

						<div
							style={{
								background: "#ffffff",
								border: "1px solid #ece0d6",
								borderRadius: 18,
								padding: 18,
								boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
								display: "grid",
								gap: 12,
							}}
						>
							<div
								style={{
									height: 28,
									width: "55%",
									borderRadius: 10,
									background: "#f4ede7",
								}}
							/>
							<div
								style={{
									height: 64,
									borderRadius: 16,
									background: "#f8f2eb",
									border: "1px solid #ece0d6",
								}}
							/>
							<div
								style={{
									height: 180,
									borderRadius: 16,
									background:
										"linear-gradient(135deg, #f4efe9 0%, #fbf8f4 100%)",
									border: "1px solid #ece0d6",
								}}
							/>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}

function CollectionFallback({
	initialRouteData,
	defaultTitle = "Products",
	defaultDescription = "",
}) {
	const title = initialRouteData?.seoTitle || defaultTitle;
	const description = initialRouteData?.seoDescription || defaultDescription;
	const cards = Array.isArray(initialRouteData?.seoCards) ? initialRouteData.seoCards : [];

	return (
		<main
			role='main'
			aria-busy='true'
			style={{
				minHeight: "100vh",
				background: "#f7f3ee",
			}}
		>
			<HeaderShell logoUrl='/logo192.png' />
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "18px 16px 28px",
				}}
			>
				<section
					style={{
						background: "#ffffff",
						border: "1px solid #ece0d6",
						borderRadius: 22,
						padding: "22px 20px",
						boxShadow: "0 14px 28px rgba(0, 0, 0, 0.06)",
					}}
				>
					<h1
						style={{
							margin: 0,
							fontSize: "clamp(1.6rem, 2.6vw, 2.5rem)",
							color: "#251f1a",
						}}
					>
						{title}
					</h1>
					{description ? (
						<p
							style={{
								margin: "10px 0 0",
								maxWidth: 760,
								color: "#65574d",
								lineHeight: 1.65,
							}}
						>
							{description}
						</p>
					) : null}
					{cards.length ? (
						<SeoProductGrid cards={cards} />
					) : (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
								gap: 16,
								marginTop: 18,
							}}
						>
							{Array.from({ length: 6 }).map((_, index) => (
								<div
									key={index}
									style={{
										height: 320,
										borderRadius: 18,
										background: "#f7f1ea",
										border: "1px solid #ece0d6",
									}}
								/>
							))}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}

function StandardProductFallback({ initialRouteData }) {
	const product = initialRouteData?.product || null;
	if (!product) return <GenericFallback />;

	const title = initialRouteData?.title || getRawProductTitle(product);
	const description = initialRouteData?.description || "";
	const imageUrl = initialRouteData?.image || getRawProductImage(product);
	const priceLabel = formatPrice(initialRouteData?.price || getRawProductPrice(product));
	const availabilityLabel = initialRouteData?.availabilityLabel || "";
	const selectionTokens = [
		initialRouteData?.selection?.color,
		initialRouteData?.selection?.size,
		initialRouteData?.selection?.scent,
	].filter(Boolean);
	const relatedCards = Array.isArray(product?.relatedProducts)
		? product.relatedProducts.slice(0, 4).map(createCardModel).filter((card) => card.href)
		: [];

	return (
		<main
			role='main'
			aria-busy='true'
			style={{
				minHeight: "100vh",
				background: "#f7f3ee",
			}}
		>
			<HeaderShell logoUrl='/logo192.png' />
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "18px 16px 28px",
				}}
			>
				<nav
					aria-label='Breadcrumb'
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 8,
						marginBottom: 16,
						color: "#73685f",
						fontSize: 14,
					}}
				>
					<Link href='/' style={{ color: "#6b5747", textDecoration: "none" }}>
						Home
					</Link>
					<span>/</span>
					<Link
						href='/our-products'
						style={{ color: "#6b5747", textDecoration: "none" }}
					>
						Our Products
					</Link>
					<span>/</span>
					<span>{title}</span>
				</nav>
				<section
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: 24,
						alignItems: "start",
					}}
				>
					<div
						style={{
							background: "#ffffff",
							border: "1px solid #ece0d6",
							borderRadius: 22,
							padding: 20,
							boxShadow: "0 16px 30px rgba(0, 0, 0, 0.07)",
							minHeight: 420,
							display: "grid",
							placeItems: "center",
						}}
					>
						{imageUrl ? (
							<img
								src={imageUrl}
								alt={title}
								style={{
									maxWidth: "100%",
									maxHeight: 520,
									objectFit: "contain",
								}}
							/>
						) : (
							<div
								style={{
									width: "100%",
									height: 420,
									borderRadius: 18,
									background: "linear-gradient(135deg, #ede7e0 0%, #f8f5f1 100%)",
								}}
							/>
						)}
					</div>
					<div
						style={{
							display: "grid",
							gap: 16,
						}}
					>
						<div
							style={{
								background: "#ffffff",
								border: "1px solid #ece0d6",
								borderRadius: 22,
								padding: 20,
								boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
							}}
						>
							<h1
								style={{
									margin: 0,
									fontSize: "clamp(1.8rem, 3vw, 2.7rem)",
									lineHeight: 1.1,
									color: "#221d19",
								}}
							>
								{title}
							</h1>
							{priceLabel ? (
								<div
									style={{
										marginTop: 12,
										fontSize: 28,
										fontWeight: 700,
										color: "#463a31",
									}}
								>
									{priceLabel}
								</div>
							) : null}
							{availabilityLabel ? (
								<div
									style={{
										marginTop: 10,
										display: "inline-flex",
										padding: "8px 12px",
										borderRadius: 999,
										background:
											availabilityLabel === "In stock" ? "#edf8ef" : "#f8ecec",
										color:
											availabilityLabel === "In stock" ? "#246a38" : "#8a3030",
										fontSize: 13,
										fontWeight: 700,
									}}
								>
									{availabilityLabel}
								</div>
							) : null}
							{description ? (
								<p
									style={{
										margin: "14px 0 0",
										color: "#5f544b",
										lineHeight: 1.7,
									}}
								>
									{description}
								</p>
							) : null}
							{selectionTokens.length ? (
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: 8,
										marginTop: 14,
									}}
								>
									{selectionTokens.map((token) => (
										<span
											key={token}
											style={{
												padding: "8px 12px",
												borderRadius: 999,
												background: "#f7efe8",
												border: "1px solid #ead8ca",
												fontSize: 13,
												color: "#5d4d40",
											}}
										>
											{token}
										</span>
									))}
								</div>
							) : null}
						</div>
						<div
							style={{
								background: "#fffaf6",
								border: "1px solid #ece0d6",
								borderRadius: 20,
								padding: 18,
								color: "#5f544b",
								lineHeight: 1.65,
							}}
						>
							Product details are loading with the interactive storefront. The core
							title, price, image, description, and related product links are already
							rendered for crawlers and fast first paint.
						</div>
					</div>
				</section>
				{relatedCards.length ? (
					<section style={{ marginTop: 22 }}>
						<h2
							style={{
								margin: 0,
								fontSize: "clamp(1.2rem, 2vw, 1.8rem)",
								color: "#2c241f",
							}}
						>
							Related products
						</h2>
						<SeoProductGrid cards={relatedCards} />
					</section>
				) : null}
			</div>
		</main>
	);
}

function GenericFallback() {
	return (
		<main
			role='main'
			aria-busy='true'
			style={{
				minHeight: "100vh",
				background: "#f7f3ee",
			}}
		>
			<HeaderShell logoUrl='/logo192.png' />
			<div
				style={{
					maxWidth: 1280,
					margin: "0 auto",
					padding: "18px 16px 28px",
				}}
			>
				<div
					style={{
						display: "grid",
						gap: 16,
					}}
				>
					<div
						style={{
							height: 180,
							borderRadius: 22,
							background: "linear-gradient(135deg, #efe8df 0%, #fbf8f4 100%)",
							border: "1px solid #ece0d6",
						}}
					/>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
							gap: 16,
						}}
					>
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={index}
								style={{
									height: 240,
									borderRadius: 18,
									background: "#ffffff",
									border: "1px solid #ece0d6",
									boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)",
								}}
							/>
						))}
					</div>
				</div>
			</div>
		</main>
	);
}

function LegacyShellFallback({ initialRouteData = null }) {
	if (initialRouteData?.type === "home") {
		return <HomeFallback initialRouteData={initialRouteData} />;
	}
	if (initialRouteData?.type === "pod-product") {
		return <PodProductFallback initialRouteData={initialRouteData} />;
	}
	if (initialRouteData?.type === "standard-product") {
		return <StandardProductFallback initialRouteData={initialRouteData} />;
	}
	if (initialRouteData?.type === "shop-list") {
		return (
			<CollectionFallback
				initialRouteData={initialRouteData}
				defaultTitle='Our Products'
				defaultDescription='Browse a curated storefront selection while the interactive filters load.'
			/>
		);
	}
	if (initialRouteData?.type === "pod-list") {
		return (
			<CollectionFallback
				initialRouteData={initialRouteData}
				defaultTitle='Custom Gifts'
				defaultDescription='Browse personalized print-on-demand gifts while the live customizer loads.'
			/>
		);
	}
	return <GenericFallback />;
}

export default function LegacyFrontendAppEntry({
	initialRouteData = null,
}) {
	preloadRouteModule(initialRouteData?.type || "");

	const LegacyFrontendApp = useMemo(
		() =>
			dynamic(() => import("./LegacyFrontendApp"), {
				ssr: false,
				loading: () => (
					<LegacyShellFallback initialRouteData={initialRouteData} />
				),
			}),
		[initialRouteData]
	);

	return <LegacyFrontendApp initialRouteData={initialRouteData} />;
}
