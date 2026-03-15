function copyUserRef(entry = null) {
	if (!entry?._id) return null;
	return {
		_id: entry._id,
		name: entry.name || "",
	};
}

function copyRelatedProduct(product = {}) {
	if (!product?._id) return null;
	return {
		_id: product._id,
		productName: product.productName || "",
		slug: product.slug || "",
		price: product.price || 0,
		priceAfterDiscount: product.priceAfterDiscount || 0,
		quantity: product.quantity || 0,
		category: product.category || null,
		thumbnailImage: Array.isArray(product.thumbnailImage) ? product.thumbnailImage : [],
		productAttributes: Array.isArray(product.productAttributes)
			? product.productAttributes.slice(0, 1)
			: [],
		printifyProductDetails: product.printifyProductDetails || null,
	};
}

function copyProductAttribute(attr = {}) {
	return {
		PK: attr.PK || "",
		SubSKU: attr.SubSKU || "",
		size: attr.size || "",
		color: attr.color || "",
		scent: attr.scent || "",
		quantity: attr.quantity || 0,
		price: attr.price || 0,
		priceAfterDiscount: attr.priceAfterDiscount || 0,
		productImages: Array.isArray(attr.productImages) ? attr.productImages : [],
		exampleDesignImage: attr.exampleDesignImage || null,
	};
}

export function createPublicProductBootstrap(product = {}) {
	const relatedProducts = Array.isArray(product?.relatedProducts)
		? product.relatedProducts.map(copyRelatedProduct).filter(Boolean).slice(0, 8)
		: [];
	const safeComments = Array.isArray(product?.comments)
		? product.comments
				.slice(0, 3)
				.map((comment) => ({
					_id: comment?._id || "",
					created: comment?.created || "",
					postedBy: copyUserRef(comment?.postedBy),
				}))
				.filter((comment) => comment._id)
		: [];
	const safeRatings = Array.isArray(product?.ratings)
		? product.ratings
				.slice(0, 10)
				.map((rating) => ({
					_id: rating?._id || "",
					star: Number(rating?.star || 0),
					ratedBy: copyUserRef(rating?.ratedBy),
					ratedOn: rating?.ratedOn || "",
				}))
				.filter((rating) => rating._id)
		: [];

	return {
		_id: product?._id || "",
		productName: product?.productName || "",
		productName_Arabic: product?.productName_Arabic || "",
		productSKU: product?.productSKU || "",
		slug: product?.slug || "",
		slug_Arabic: product?.slug_Arabic || "",
		description: product?.description || "",
		description_Arabic: product?.description_Arabic || "",
		price: product?.price || 0,
		priceAfterDiscount: product?.priceAfterDiscount || 0,
		price_unit: product?.price_unit || "USD",
		category: product?.category || null,
		subcategory: Array.isArray(product?.subcategory) ? product.subcategory : [],
		gender: product?.gender || null,
		quantity: product?.quantity || 0,
		scent: product?.scent || "",
		shipping: product?.shipping !== false,
		addVariables: Boolean(product?.addVariables),
		clearance: Boolean(product?.clearance),
		chosenSeason: product?.chosenSeason || "",
		color: product?.color || "",
		size: product?.size || "",
		thumbnailImage: Array.isArray(product?.thumbnailImage) ? product.thumbnailImage : [],
		geodata: product?.geodata || {},
		productAttributes: Array.isArray(product?.productAttributes)
			? product.productAttributes.map(copyProductAttribute)
			: [],
		likes: Array.isArray(product?.likes) ? product.likes : [],
		relatedProducts,
		comments: safeComments,
		ratings: safeRatings,
		bootstrapMode: "lean",
	};
}
