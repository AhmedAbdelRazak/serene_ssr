import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import styled from "styled-components";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const PrintifyMain = () => {
	const [collapsed, setCollapsed] = useState(false);

	// 1) All products (for the left list)
	const [products, setProducts] = useState([]);

	// 2) Selected product ID & data
	const [selectedProductId, setSelectedProductId] = useState(null);
	const [selectedProductData, setSelectedProductData] = useState(null);

	// 3) Local state for editing
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState([]);
	const [variants, setVariants] = useState([]);
	const [printAreas, setPrintAreas] = useState([]);
	const [newVariantId, setNewVariantId] = useState("");

	// On mount, decide whether we collapse
	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, []);

	//----------------------------------------------------------------------
	// 1. Fetch all products (for the left list)
	//----------------------------------------------------------------------
	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const { data } = await axios.get(
					`${process.env.REACT_APP_API_URL}/specific-printify-products`
				);
				setProducts(data.products || []);
			} catch (err) {
				console.error("Failed to fetch products:", err);
				toast.error("Error fetching Printify products");
			}
		};
		fetchProducts();
	}, []);

	//----------------------------------------------------------------------
	// 2. Fetch single product details each time user selects a product
	//----------------------------------------------------------------------
	useEffect(() => {
		const fetchSingleProduct = async () => {
			if (!selectedProductId) {
				setSelectedProductData(null);
				return;
			}
			try {
				// GET /single-printify-product/:product_id
				const res = await axios.get(
					`${process.env.REACT_APP_API_URL}/single-printify-product/${selectedProductId}`
				);
				if (res.data.success !== false && res.data.product) {
					const product = res.data.product;
					setSelectedProductData(product);

					// Initialize local form fields from product
					setTitle(product.title || "");
					setDescription(product.description || "");
					setTags(product.tags || []);
					setVariants(product.variants || []);
					setPrintAreas(product.print_areas || []);
				} else {
					setSelectedProductData(null);
				}
			} catch (err) {
				console.error("Failed to fetch single product:", err);
				toast.error("Error fetching product details");
			}
		};

		fetchSingleProduct();
	}, [selectedProductId]);

	//----------------------------------------------------------------------
	// TAGS: add/remove/update (commented out if not needed right now)
	//----------------------------------------------------------------------
	// const handleAddTag = () => {
	// 	setTags((prev) => [...prev, ""]);
	// };
	// const handleRemoveTag = (index) => {
	// 	setTags((prev) => prev.filter((_, i) => i !== index));
	// };
	// const handleTagChange = (index, newValue) => {
	// 	setTags((prev) => {
	// 		const copy = [...prev];
	// 		copy[index] = newValue;
	// 		return copy;
	// 	});
	// };

	//----------------------------------------------------------------------
	// VARIANTS: enable/disable, price, sku, cost, etc.
	//----------------------------------------------------------------------
	const handleVariantChange = (vIndex, field, value) => {
		setVariants((prev) => {
			const updated = [...prev];
			updated[vIndex][field] = value;
			return updated;
		});
	};

	//----------------------------------------------------------------------
	// PRINT AREAS => placeholders => images
	//----------------------------------------------------------------------
	const handleImageChange = (paIndex, phIndex, imgIndex, field, value) => {
		setPrintAreas((prev) => {
			const copy = [...prev];
			copy[paIndex].placeholders[phIndex].images[imgIndex][field] = value;
			return copy;
		});
	};

	// Add a new image or text layer
	const handleAddLayer = (paIndex, phIndex, layerType = "image") => {
		const newLayer =
			layerType === "text"
				? {
						type: "text",
						input_text: "New text",
						font_family: "Arial",
						font_size: 24,
						font_color: "#000000",
						x: 0.5,
						y: 0.5,
						scale: 1,
						angle: 0,
					}
				: {
						type: "image",
						id: "",
						x: 0.5,
						y: 0.5,
						scale: 1,
						angle: 0,
					};

		setPrintAreas((prev) => {
			const copy = [...prev];
			copy[paIndex].placeholders[phIndex].images.push(newLayer);
			return copy;
		});
	};

	// Remove a layer from images
	const handleRemoveLayer = (paIndex, phIndex, imgIndex) => {
		setPrintAreas((prev) => {
			const copy = [...prev];
			copy[paIndex].placeholders[phIndex].images.splice(imgIndex, 1);
			return copy;
		});
	};

	//----------------------------------------------------------------------
	// ------------------- NEW: Handle Add Extra Variants -------------------
	//----------------------------------------------------------------------
	const handleAddExtraVariant = async () => {
		if (!selectedProductData) {
			toast.error("No product selected.");
			return;
		}
		if (!newVariantId.trim()) {
			toast.error("Please enter a variant ID first.");
			return;
		}

		const blueprintId = selectedProductData.blueprint_id;
		const printProviderId = selectedProductData.print_provider_id;

		if (!blueprintId || !printProviderId) {
			toast.error(
				"Missing blueprint_id / print_provider_id. Cannot fetch catalog to add variants."
			);
			return;
		}

		try {
			// 1) fetch the entire list of variants from Catalog
			const catRes = await axios.get(
				`https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json?show-out-of-stock=1`,
				{
					headers: {
						Authorization: `Bearer ${process.env.REACT_APP_PRINTIFY_TOKEN}`,
					},
				}
			);
			const catVariants = catRes.data; // array of { id, title, is_available, etc. }

			// 2) find the variant with the user-specified ID
			const parsedId = parseInt(newVariantId, 10);
			const found = catVariants.find((cv) => cv.id === parsedId);
			if (!found) {
				toast.error(`Variant ID ${newVariantId} not found in the catalog.`);
				return;
			}

			// 3) if it's already in your product, skip
			if (variants.some((v) => v.id === found.id)) {
				toast.info("This variant is already part of the product.");
				return;
			}

			// 4) Add it to the local variants array
			// Assume we have no known cost from the catalog for demonstration
			const newVar = {
				id: found.id,
				sku: `SKU-${found.id}`,
				cost: found?.cost || 0, // or from catalog if available
				price: 2000, // example default price in cents
				is_enabled: true,
				is_default: false,
				title: found.title,
				is_available: found.is_available,
			};

			// 5) update your print_areas => we assume we put it in the first print_area
			const updatedPrintAreas = [...printAreas];
			if (updatedPrintAreas.length > 0) {
				updatedPrintAreas[0] = {
					...updatedPrintAreas[0],
					variant_ids: [...(updatedPrintAreas[0].variant_ids || []), found.id],
				};
			}

			// 6) Update local React state
			setVariants((prev) => [...prev, newVar]);
			setPrintAreas(updatedPrintAreas);

			toast.success(
				`Variant ${found.id} was added locally. Click "Update Product" to push changes to Printify.`
			);
			setNewVariantId(""); // clear the input
		} catch (err) {
			console.error("Error adding extra variant:", err);
			toast.error("Failed to add the new variant. Check console for details.");
		}
	};

	//----------------------------------------------------------------------
	// 3. Handle "Update" => PUT /update-printify-product/:product_id
	//----------------------------------------------------------------------
	const handleUpdateProduct = async (e) => {
		e.preventDefault();
		if (!selectedProductId) return;

		try {
			const updatePayload = {
				title,
				description,
				tags,
				variants,
				print_areas: printAreas,
			};

			console.log("Sending update payload:", updatePayload);

			await axios.put(
				`${process.env.REACT_APP_API_URL}/update-printify-product/${selectedProductId}`,
				updatePayload
			);
			toast.success("Product updated successfully!");

			// Optionally update local state
			setSelectedProductData((prev) =>
				prev
					? {
							...prev,
							title,
							description,
							tags,
							variants,
							print_areas: printAreas,
						}
					: null
			);
		} catch (err) {
			console.error("Update error:", err.response?.data || err.message);
			toast.error("Failed to update product");
		}
	};

	// RENDER
	return (
		<PrintifyMainWrapper show={collapsed}>
			<ToastContainer className='toast-top-center' position='top-center' />

			<div className='grid-container-main'>
				<div className='navcontent'>
					<AdminNavbar
						fromPage='PrintifyMain'
						collapsed={collapsed}
						setCollapsed={setCollapsed}
					/>
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<Layout>
							{/* LEFT: Product List */}
							<LeftColumn>
								<h3>All Products</h3>
								{products.map((prod) => (
									<ProductItem
										key={prod.id}
										active={prod.id === selectedProductId}
										onClick={() => setSelectedProductId(prod.id)}
									>
										{prod.title}
									</ProductItem>
								))}
							</LeftColumn>

							{/* RIGHT: Selected Product Details */}
							<RightColumn>
								{selectedProductData ? (
									<div>
										<h2>Update: {selectedProductData.title}</h2>

										{/* Optional: button to fetch shipping info */}
										{/* If the backend appended shipping_info, show it here */}
										{selectedProductData.shipping_info && (
											<div style={{ marginBottom: "1rem" }}>
												<h4>Shipping Options</h4>
												<p style={{ fontSize: "0.9rem" }}>
													The backend appended shipping data from Printify's v2
													endpoint:
												</p>
												<pre
													style={{
														background: "#f3f3f3",
														padding: "8px",
														borderRadius: "4px",
														maxHeight: "200px",
														overflow: "auto",
													}}
												>
													{JSON.stringify(
														selectedProductData.shipping_info,
														null,
														2
													)}
												</pre>
											</div>
										)}

										<form onSubmit={handleUpdateProduct}>
											{/* Title & Description */}
											<div style={{ marginBottom: "1rem" }}>
												<label>Title</label>
												<input
													type='text'
													value={title}
													onChange={(e) => setTitle(e.target.value)}
													style={{ width: "100%", marginTop: "5px" }}
												/>
											</div>

											<div style={{ marginBottom: "1rem" }}>
												<label>Description</label>
												<textarea
													rows={4}
													value={description}
													onChange={(e) => setDescription(e.target.value)}
													style={{ width: "100%", marginTop: "5px" }}
												/>
											</div>

											{/* Variants */}
											<div style={{ marginBottom: "1rem" }}>
												<h4>Variants (Cost vs. Price)</h4>
												{variants.map((variant, vIndex) => (
													<VariantRow key={variant.id}>
														<p>
															<strong>{variant.title}</strong> (ID: {variant.id}
															)
														</p>

														<label>SKU:</label>
														<input
															type='text'
															value={variant.sku || ""}
															onChange={(e) =>
																handleVariantChange(
																	vIndex,
																	"sku",
																	e.target.value
																)
															}
														/>

														{/* Show cost in read-only, in dollars */}
														<label>Cost ($):</label>
														<input
															type='text'
															readOnly
															value={((variant.cost ?? 0) / 100).toFixed(2)}
															style={{ width: "60px" }}
														/>

														{/* Price is adjustable */}
														<label>Price ($):</label>
														<input
															type='number'
															step='0.01'
															value={((variant.price ?? 0) / 100).toFixed(2)}
															onChange={(e) =>
																handleVariantChange(
																	vIndex,
																	"price",
																	Math.round(parseFloat(e.target.value) * 100)
																)
															}
															style={{ width: "60px" }}
														/>

														<label>Enabled:</label>
														<input
															type='checkbox'
															checked={variant.is_enabled}
															onChange={(e) =>
																handleVariantChange(
																	vIndex,
																	"is_enabled",
																	e.target.checked
																)
															}
														/>
													</VariantRow>
												))}
											</div>

											{/* Print Areas */}
											<div style={{ marginBottom: "1rem" }}>
												<h4>Print Areas</h4>
												{printAreas.map((pa, paIndex) => (
													<div
														key={paIndex}
														style={{
															border: "1px solid #ccc",
															padding: "8px",
															marginBottom: "10px",
														}}
													>
														<p>
															<strong>Variant IDs:</strong>{" "}
															{pa.variant_ids?.join(", ")}
														</p>

														{pa.placeholders?.map((ph, phIndex) => (
															<div
																key={phIndex}
																style={{
																	marginLeft: "10px",
																	borderLeft: "3px solid #ccc",
																	paddingLeft: "10px",
																}}
															>
																<p>
																	<strong>Placeholder:</strong> {ph.position}
																</p>
																{ph.images?.map((img, imgIndex) => (
																	<div
																		key={imgIndex}
																		style={{
																			marginBottom: "8px",
																			padding: "4px",
																			border: "1px dotted #999",
																		}}
																	>
																		<label>Type:</label>
																		<select
																			style={{ margin: "5px" }}
																			value={img.type || "image"}
																			onChange={(e) =>
																				handleImageChange(
																					paIndex,
																					phIndex,
																					imgIndex,
																					"type",
																					e.target.value
																				)
																			}
																		>
																			<option value='image'>Image</option>
																			<option value='text'>Text</option>
																		</select>

																		{img.type === "text" ? (
																			<div>
																				<label>Text:</label>
																				<input
																					type='text'
																					value={img.input_text || ""}
																					onChange={(e) =>
																						handleImageChange(
																							paIndex,
																							phIndex,
																							imgIndex,
																							"input_text",
																							e.target.value
																						)
																					}
																					style={{
																						width: "70%",
																						margin: "5px 0",
																					}}
																				/>
																				<label>Font:</label>
																				<input
																					type='text'
																					value={img.font_family || ""}
																					onChange={(e) =>
																						handleImageChange(
																							paIndex,
																							phIndex,
																							imgIndex,
																							"font_family",
																							e.target.value
																						)
																					}
																					style={{
																						margin: "5px",
																					}}
																				/>
																				<label>Size:</label>
																				<input
																					type='number'
																					value={img.font_size || 24}
																					onChange={(e) =>
																						handleImageChange(
																							paIndex,
																							phIndex,
																							imgIndex,
																							"font_size",
																							parseInt(e.target.value)
																						)
																					}
																					style={{
																						margin: "5px",
																					}}
																				/>
																				<label>Color:</label>
																				<input
																					type='color'
																					value={img.font_color || "#000000"}
																					onChange={(e) =>
																						handleImageChange(
																							paIndex,
																							phIndex,
																							imgIndex,
																							"font_color",
																							e.target.value
																						)
																					}
																					style={{
																						margin: "5px",
																					}}
																				/>
																			</div>
																		) : (
																			<div>
																				<label>ID or Src:</label>
																				<input
																					type='text'
																					value={img.id || img.src || ""}
																					onChange={(e) =>
																						handleImageChange(
																							paIndex,
																							phIndex,
																							imgIndex,
																							img.id !== undefined
																								? "id"
																								: "src",
																							e.target.value
																						)
																					}
																					style={{
																						width: "70%",
																						margin: "5px",
																					}}
																				/>
																			</div>
																		)}

																		{/* Shared positioning fields */}
																		<div
																			style={{
																				display: "flex",
																				gap: "5px",
																				flexWrap: "wrap",
																			}}
																		>
																			<label>X:</label>
																			<input
																				type='number'
																				step='0.01'
																				value={img.x ?? 0.5}
																				onChange={(e) =>
																					handleImageChange(
																						paIndex,
																						phIndex,
																						imgIndex,
																						"x",
																						parseFloat(e.target.value)
																					)
																				}
																			/>
																			<label>Y:</label>
																			<input
																				type='number'
																				step='0.01'
																				value={img.y ?? 0.5}
																				onChange={(e) =>
																					handleImageChange(
																						paIndex,
																						phIndex,
																						imgIndex,
																						"y",
																						parseFloat(e.target.value)
																					)
																				}
																			/>
																			<label>Scale:</label>
																			<input
																				type='number'
																				step='0.01'
																				value={img.scale ?? 1}
																				onChange={(e) =>
																					handleImageChange(
																						paIndex,
																						phIndex,
																						imgIndex,
																						"scale",
																						parseFloat(e.target.value)
																					)
																				}
																			/>
																			<label>Angle:</label>
																			<input
																				type='number'
																				step='1'
																				value={img.angle ?? 0}
																				onChange={(e) =>
																					handleImageChange(
																						paIndex,
																						phIndex,
																						imgIndex,
																						"angle",
																						parseInt(e.target.value)
																					)
																				}
																			/>
																		</div>

																		<button
																			type='button'
																			style={{
																				background: "#c00",
																				color: "#fff",
																				marginTop: "5px",
																			}}
																			onClick={() =>
																				handleRemoveLayer(
																					paIndex,
																					phIndex,
																					imgIndex
																				)
																			}
																		>
																			Remove Layer
																		</button>
																	</div>
																))}
																<button
																	type='button'
																	onClick={() =>
																		handleAddLayer(paIndex, phIndex, "image")
																	}
																	style={{ marginRight: "5px" }}
																>
																	+ Add New Image Layer
																</button>
																<button
																	type='button'
																	onClick={() =>
																		handleAddLayer(paIndex, phIndex, "text")
																	}
																>
																	+ Add New Text Layer
																</button>
															</div>
														))}
													</div>
												))}
											</div>

											{/* NEW SECTION for adding extra variants */}
											<div style={{ marginBottom: "1rem" }}>
												<h4>Add Extra Variant (Same Blueprint/Provider)</h4>
												<p style={{ fontSize: "0.9rem" }}>
													Enter Variant ID. Must be from the same blueprint &
													print provider. We'll fetch from Printify Catalog to
													confirm it.
												</p>
												<div style={{ display: "flex", gap: "6px" }}>
													<input
														type='text'
														value={newVariantId}
														onChange={(e) => setNewVariantId(e.target.value)}
														placeholder='e.g. 12345'
														style={{
															border: "1px solid #ccc",
															borderRadius: "4px",
															padding: "6px",
														}}
													/>
													<button type='button' onClick={handleAddExtraVariant}>
														Add Variant
													</button>
												</div>
											</div>

											<button type='submit' style={{ marginTop: "10px" }}>
												Update Product
											</button>
										</form>
									</div>
								) : (
									<div style={{ marginTop: "20px" }}>
										<h3>Please Select A Product To Update</h3>
									</div>
								)}
							</RightColumn>
						</Layout>
					</div>
				</div>
			</div>
		</PrintifyMainWrapper>
	);
};

export default PrintifyMain;

/* ----------------- STYLED COMPONENTS ------------------ */
const PrintifyMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 80px;
	padding-bottom: 100px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 75%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}
`;

const Layout = styled.div`
	display: grid;
	grid-template-columns: 25% 75%;
	min-height: 600px;
	gap: 1rem;
`;

const LeftColumn = styled.div`
	border-right: 1px solid #ccc;
	padding-right: 1rem;
`;

const ProductItem = styled.div`
	padding: 8px;
	margin-bottom: 6px;
	cursor: pointer;
	background: ${({ active }) => (active ? "#f2f2f2" : "transparent")};
	border: ${({ active }) => (active ? "1px solid #ccc" : "none")};
	border-radius: 4px;

	&:hover {
		background: #eee;
	}
`;

const RightColumn = styled.div`
	padding-left: 1rem;

	h2 {
		margin-bottom: 1rem;
	}

	form {
		label {
			font-weight: bold;
		}
		input,
		textarea,
		select {
			padding: 6px;
			margin-left: 5px;
			margin-bottom: 5px;
			border: 1px solid #ccc;
			border-radius: 4px;
		}

		button {
			padding: 8px 16px;
			border: none;
			border-radius: 4px;
			background: #0077ff;
			color: #fff;
			cursor: pointer;
			margin-right: 5px;
		}
	}
`;

const VariantRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	margin-bottom: 8px;
	padding: 6px;
	border: 1px dashed #ccc;

	p {
		margin: 0;
		margin-right: 10px;
	}

	input {
		width: auto;
	}
`;
