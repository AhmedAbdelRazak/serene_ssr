/** @format */
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Select } from "antd";
import axios from "axios";
import {
	updateProduct,
	cloudinaryUpload1,
	getCategories,
	getColors,
	getGenders,
	getListOfSubs,
	getProducts,
	getSizes,
	getStoreManagement,
} from "../../apiSeller";
import { isAuthenticated } from "../../../auth";
import { toast } from "react-toastify";
import UpdateBasicDataForm from "./UpdateBasicDataForm";
import UpdatingProductVariable from "./UpdateProductVariable";
import ImageCard from "../AddingProduct/ImageCard";
import { Redirect } from "react-router-dom";

const { Option } = Select;

// Helper to style active/inactive tabs
const isActive = (clickedLink, sureClickedLink) => {
	if (clickedLink === sureClickedLink) {
		return {
			background: "#dbeeff",
			fontWeight: "bold",
			padding: "3px 2px",
			borderRadius: "5px",
		};
	} else {
		return { color: "#a1a5b7", fontWeight: "bold" };
	}
};

const UpdateProductSingle = ({ productId }) => {
	const [clickedLink, setClickedLink] = useState("MainData");
	// eslint-disable-next-line
	const [loading, setLoading] = useState(true);

	// Basic product fields
	const [productName, setProductName] = useState("");
	const [productName_Arabic, setProductName_Arabic] = useState("");
	const [productSKU, setProductSKU] = useState("");
	const [slug, setSlug] = useState("");
	const [slug_Arabic, setSlug_Arabic] = useState("");
	const [description, setDescription] = useState("");
	const [description_Arabic, setDescription_Arabic] = useState("");

	// Category / subcat / gender
	const [chosenSubcategories, setChosenSubcategories] = useState([]);
	const [chosenCategory, setChosenCategory] = useState("");
	const [chosenGender, setChosenGender] = useState("");
	const [allCategories, setAllCategories] = useState([]);
	const [subsOptions, setSubsOptions] = useState([]);
	const [allGenders, setAllGenders] = useState([]);

	// Thumbnail + price / stock
	const [addThumbnail, setAddThumbnail] = useState([]);
	const [price, setPrice] = useState("");
	const [priceAfterDiscount, setPriceAfterDiscount] = useState("");
	const [MSRPPriceBasic, setMSRPPriceBasic] = useState("");
	const [stock, setStock] = useState("");
	const [viewsCount, setViewsCount] = useState(0);

	// Seasons / size chart
	const [chosenSeason, setChosenSeason] = useState("");
	const [sizeChart, setSizeChart] = useState("");

	// Variables toggles
	const [addVariables, setAddVariables] = useState(false);
	const [clickedVariableLink, setClickedVariableLink] =
		useState("SizesColorsImages");
	const [variablesSubmit, setVariablesSubmit] = useState(false);

	// Colors / sizes
	const [chosenSizes, setChosenSizes] = useState([]);
	const [chosenColors, setChosenColors] = useState([]);
	const [allColors, setAllColors] = useState([]);
	const [allSizes, setAllSizes] = useState([]);
	const [mainColor, setMainColor] = useState("");
	const [mainSize, setMainSize] = useState("");

	// Additional toggles
	const [clearance, setClearance] = useState(false);
	const [activeBackorder, setActiveBackorder] = useState(false);
	const [shipping, setShipping] = useState(true);
	const [activeProduct, setActiveProduct] = useState(true);

	// Product attributes
	const [productAttributesFinal, setProductAttributesFinal] = useState([]);
	let productAttributes = [];

	// Store / doc references
	const [storeData, setStoreData] = useState(null);
	const [selectedProductToUpdate, setSelectedProductToUpdate] = useState(null);
	const [storeName, setStoreName] = useState("");

	// Product dimension
	const [geodata, setGeodata] = useState({
		length: "",
		width: "",
		height: "",
		weight: "",
	});

	const { user, token } = isAuthenticated();

	/* =========================================
     1) On mount, try localStorage => fallback to loadStoreAndProducts
  ========================================= */
	useEffect(() => {
		const localStoreData = localStorage.getItem("storeData");
		if (localStoreData) {
			try {
				const parsedData = JSON.parse(localStoreData);
				if (parsedData && parsedData._id) {
					// We have a store => fetch its products, find the product
					console.log("Using store from localStorage => fetching products");
					setStoreData(parsedData);
					loadProductsForStore(parsedData._id);
				} else {
					toast.error("No valid store found in local storage.");
					// fallback
					loadStoreAndProducts();
				}
			} catch (err) {
				console.error("Error parsing storeData from localStorage:", err);
				loadStoreAndProducts(); // fallback
			}
		} else {
			loadStoreAndProducts();
		}

		loadAllCategories();
		loadAllGenders();
		loadAllColors();

		// small delay for variables if needed
		setTimeout(() => setVariablesSubmit(true), 3000);
		// eslint-disable-next-line
	}, [productId]);

	// Helper: fetch products for a given store, locate product by productId
	const loadProductsForStore = (storeId) => {
		setLoading(true);
		getProducts(storeId).then((data) => {
			setLoading(false);
			if (!data || data.error) {
				console.log(data?.error || "Error fetching products");
				return;
			}
			// find the product with productId
			const found = data.find((p) => p._id === productId);
			if (!found) {
				console.log(`No product found with ID: ${productId}`);
				return;
			}
			fillProductState(found);
		});
	};

	// Original fallback: fetch store => products => locate product
	const loadStoreAndProducts = () => {
		setLoading(true);
		getStoreManagement(user._id, token)
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					// Merge forced fields
					const mergedData = {
						...res,
						transactionFeePercentage: 3.5,
						activatePayOnDelivery: false,
					};
					setStoreData(mergedData);

					// If store has _id, load products
					if (mergedData && mergedData._id) {
						getProducts(mergedData._id).then((data) => {
							if (!data || data.error) {
								console.log(data?.error || "Error fetching products");
								return;
							}
							// find the product with productId
							const found = data.find((p) => p._id === productId);
							if (!found) {
								console.log(`No product found with ID: ${productId}`);
								return;
							}
							fillProductState(found);
						});
					}
				} else if (res && res.error) {
					console.log("Error fetching store management:", res.error);
				}
			})
			.catch((err) => {
				setLoading(false);
				console.error("Error fetching store management:", err);
			});
	};

	/* =========================================
     2) Fill local states with the found product
  ========================================= */
	const fillProductState = (prod) => {
		setSelectedProductToUpdate(prod);

		setProductName(prod.productName);
		setProductName_Arabic(prod.productName_Arabic);
		setSizeChart(prod.sizeChart || "");
		setSlug(prod.slug || "");
		setSlug_Arabic(prod.slug_Arabic || "");
		setMainColor(prod.color || "");
		setMainSize(prod.size || "");
		setProductSKU(prod.productSKU || "");
		setDescription(prod.description || "");
		setDescription_Arabic(prod.description_Arabic || "");

		// subcategory => array of _id
		setChosenSubcategories(
			prod.subcategory ? prod.subcategory.map((sc) => sc._id) : []
		);
		setChosenCategory(prod.category || "");
		setChosenGender(prod.gender || "");

		// If there's a thumbnailImage array
		if (
			prod.thumbnailImage &&
			prod.thumbnailImage[0] &&
			prod.thumbnailImage[0].images &&
			prod.thumbnailImage[0].images.length > 0
		) {
			setAddThumbnail(prod.thumbnailImage[0]);
		} else {
			setAddThumbnail([]);
		}

		setPrice(prod.price || "");
		setPriceAfterDiscount(prod.priceAfterDiscount || "");
		setMSRPPriceBasic(prod.MSRPPriceBasic || "");
		setStock(prod.quantity || "");

		setChosenSeason(prod.chosenSeason || "");
		setViewsCount(prod.viewsCount || 0);

		setAddVariables(prod.addVariables || false);
		setClearance(prod.clearance || false);
		setActiveBackorder(prod.activeBackorder || false);
		setShipping(prod.shipping || false);
		// If the doc uses "activeProductBySeller" or "activeProduct"
		setActiveProduct(prod.activeProductBySeller ?? true);

		setStoreName(prod.storeName || "");
		setProductAttributesFinal(prod.productAttributes || []);

		// Unique color / size for variable combos
		const uniqColors = [
			...new Set(prod.productAttributes.map((ii) => ii.color)),
		];
		const uniqSizes = [...new Set(prod.productAttributes.map((ii) => ii.size))];
		setChosenColors(uniqColors);
		setChosenSizes(uniqSizes);

		// geodata
		setGeodata(
			prod.geodata || { length: "", width: "", height: "", weight: "" }
		);

		// If category is known, fetch subcategories
		if (prod.category && prod.category._id) {
			getListOfSubs(prod.category._id).then((subres) => {
				if (subres && !subres.error) {
					setSubsOptions(subres);
				}
			});
		}
	};

	/* =========================================
     3) Load categories, genders, colors, sizes
  ========================================= */
	const loadAllCategories = () => {
		getCategories(user._id, token).then((data) => {
			if (data && !data.error) {
				setAllCategories(data.filter((c) => c.categoryStatus === true));
			}
		});
	};

	const loadAllGenders = () => {
		getGenders(token).then((data) => {
			if (data && !data.error) {
				setAllGenders(data);
			}
		});
	};

	const loadAllColors = () => {
		getColors(token).then((colRes) => {
			if (colRes && !colRes.error) {
				// after colors, load sizes
				getSizes(token).then((sizeRes) => {
					if (sizeRes && !sizeRes.error) {
						setAllSizes(sizeRes);
					}
				});
				setAllColors(colRes);
			}
		});
	};

	/* =========================================
     4) Category / Subcat / Gender
  ========================================= */
	const handleCategoryChange = (e) => {
		setChosenCategory(e.target.value);
		setChosenSubcategories([]);
		getListOfSubs(e.target.value).then((res) => {
			if (res && !res.error) {
				setSubsOptions(res);
			}
		});
	};

	const handleChangeGender = (e) => {
		setChosenGender(e.target.value);
	};

	const CategorySubcategoryEntry = () => {
		return (
			<form className='formwrapper ml-5 py-4 mt-4' style={{ maxWidth: "80%" }}>
				<div className='form-group'>
					<h5 style={{ fontWeight: "bold", fontSize: "1.05rem" }}>
						Add Category / Subcategory
					</h5>

					<label className='mt-3'>Gender</label>
					<select
						name='gender'
						className='form-control'
						onChange={handleChangeGender}
					>
						<option>
							{chosenGender && chosenGender.genderName
								? chosenGender.genderName
								: "Please select"}
						</option>
						{allGenders.map((g) => (
							<option key={g._id} value={g._id}>
								{g.genderName}
							</option>
						))}
					</select>
				</div>

				<div className='form-group'>
					<label>Category</label>
					<select
						name='category'
						className='form-control'
						style={{ textTransform: "uppercase" }}
						onChange={handleCategoryChange}
					>
						<option>
							{chosenCategory && chosenCategory.categoryName
								? chosenCategory.categoryName
								: "Please select"}
						</option>
						{allCategories.map((cat) => (
							<option key={cat._id} value={cat._id}>
								{cat.categoryName}
							</option>
						))}
					</select>
				</div>

				{subsOptions && subsOptions.length > 0 && (
					<div className='form-group'>
						<label>Sub Category</label>
						<Select
							mode='multiple'
							style={{ width: "100%", textTransform: "uppercase" }}
							placeholder='Please Select a subcategory'
							value={chosenSubcategories}
							onChange={(value) => setChosenSubcategories(value)}
						>
							{subsOptions.map((sub) => (
								<Option key={sub._id} value={sub._id}>
									{sub.SubcategoryName}
								</Option>
							))}
						</Select>
					</div>
				)}
			</form>
		);
	};

	/* =========================================
     5) Basic Data Form rendering
  ========================================= */
	const UpdateBasicDataFormFunction = () => (
		<UpdateBasicDataForm
			setProductName={setProductName}
			productName={productName}
			productName_Arabic={productName_Arabic}
			setProductName_Arabic={setProductName_Arabic}
			description={description}
			setDescription={setDescription}
			description_Arabic={description_Arabic}
			setDescription_Arabic={setDescription_Arabic}
			setSlug={setSlug}
			setSlug_Arabic={setSlug_Arabic}
			productSKU={productSKU}
			setProductSKU={setProductSKU}
			setAddVariables={setAddVariables}
			addVariables={addVariables}
			setClickedLink={setClickedLink}
			chosenSeason={chosenSeason}
			setChosenSeason={setChosenSeason}
			mainColor={mainColor}
			setMainColor={setMainColor}
			mainSize={mainSize}
			setMainSize={setMainSize}
			allColors={allColors}
			allSizes={allSizes}
			geodata={geodata}
			setGeodata={setGeodata}
		/>
	);

	/* =========================================
     6) File Upload
  ========================================= */
	const fileUploadAndResizeThumbNail = (e) => {
		let files = e.target.files;
		let updatedThumbnails = [...(addThumbnail.images || [])];

		if (files) {
			for (let i = 0; i < files.length; i++) {
				let fileSizeInMB = files[i].size / 1024 / 1024;
				if (fileSizeInMB >= 1) {
					toast.error(
						`Image #${i + 1} is more than 1MB, please try another one`
					);
					continue;
				}
				let reader = new FileReader();
				reader.readAsDataURL(files[i]);
				reader.onload = (evt) => {
					let img = new Image();
					img.src = evt.target.result;
					img.onload = () => {
						const maxWidth = 800;
						const maxHeight = 954;
						let width = img.width;
						let height = img.height;
						if (width > height) {
							if (width > maxWidth) {
								height *= maxWidth / width;
								width = maxWidth;
							}
						} else {
							if (height > maxHeight) {
								width *= maxHeight / height;
								height = maxHeight;
							}
						}
						let canvas = document.createElement("canvas");
						canvas.width = width;
						canvas.height = height;
						let ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0, width, height);
						let uri = canvas.toDataURL("image/jpeg", 1);

						cloudinaryUpload1(user._id, token, { image: uri })
							.then((data) => {
								updatedThumbnails.push(data);
								setAddThumbnail({ images: updatedThumbnails });
							})
							.catch((err) => console.log("CLOUDINARY UPLOAD ERR", err));
					};
				};
			}
		}
	};

	const handleImageRemove = (public_id) => {
		setLoading(true);
		axios
			.post(
				`${process.env.REACT_APP_API_URL}/admin/removeimage/${user._id}`,
				{ public_id },
				{ headers: { Authorization: `Bearer ${token}` } }
			)
			.then(() => {
				if (!addThumbnail.images) return;
				let filteredImages = addThumbnail.images.filter(
					(img) => img.public_id !== public_id
				);
				setAddThumbnail({ ...addThumbnail, images: filteredImages });
				setLoading(false);
			})
			.catch((err) => {
				console.log(err);
				setLoading(false);
			});
	};

	const FileUploadThumbnail = () => {
		return (
			<ImageCard
				uploadFrom='BasicProduct'
				addThumbnail={addThumbnail}
				handleImageRemove={handleImageRemove}
				setAddThumbnail={setAddThumbnail}
				fileUploadAndResizeThumbNail={fileUploadAndResizeThumbNail}
			/>
		);
	};

	// For addVariables = true
	const fileUploadAndResizeThumbNail2 = (e) => {
		let files = e.target.files;
		let allUploadedFiles = addThumbnail;
		if (files) {
			for (let i = 0; i < files.length; i++) {
				let fileSizeInMB = files[i].size / 1024 / 1024;
				if (fileSizeInMB >= 1) {
					toast.error(`Image #${i + 1} is more than 1MB`);
					continue;
				}
				let reader = new FileReader();
				reader.readAsDataURL(files[i]);
				reader.onload = (evt) => {
					let img = new Image();
					img.src = evt.target.result;
					img.onload = () => {
						const maxWidth = 800;
						const maxHeight = 954;
						let width = img.width;
						let height = img.height;
						if (width > height) {
							if (width > maxWidth) {
								height *= maxWidth / width;
								width = maxWidth;
							}
						} else {
							if (height > maxHeight) {
								width *= maxHeight / height;
								height = maxHeight;
							}
						}
						let canvas = document.createElement("canvas");
						canvas.width = width;
						canvas.height = height;
						let ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0, width, height);
						let uri = canvas.toDataURL("image/jpeg", 1);

						cloudinaryUpload1(user._id, token, { image: uri })
							.then((data) => {
								allUploadedFiles.push(data);
								setAddThumbnail({ ...addThumbnail, images: allUploadedFiles });
							})
							.catch((err) => console.log("CLOUDINARY UPLOAD ERR", err));
					};
				};
			}
		}
	};

	const handleImageRemove2 = (public_id) => {
		axios
			.post(
				`${process.env.REACT_APP_API_URL}/admin/removeimage/${user._id}`,
				{ public_id },
				{ headers: { Authorization: `Bearer ${token}` } }
			)
			.then(() => {
				setAddThumbnail([]);
			})
			.catch((err) => {
				console.log(err);
			});
	};

	const FileUploadThumbnail2 = () => {
		return (
			<ImageCard
				addThumbnail={addThumbnail}
				handleImageRemove={handleImageRemove2}
				setAddThumbnail={setAddThumbnail}
				fileUploadAndResizeThumbNail={fileUploadAndResizeThumbNail2}
			/>
		);
	};

	/* =========================================
     7) Price / Stock
  ========================================= */
	const handleChange3 = (e) => setPrice(e.target.value);
	const handleChange4 = (e) => setPriceAfterDiscount(e.target.value);
	const handleChange5 = (e) => setStock(e.target.value);
	const handleChange6 = (e) => setMSRPPriceBasic(e.target.value);

	const AddPricesStockBasic = () => {
		return (
			<form>
				<div className='form-group'>
					<label style={{ fontWeight: "bold", fontSize: "13px" }}>
						Purchase Price
					</label>
					<input
						type='text'
						className='form-control'
						onChange={handleChange6}
						value={MSRPPriceBasic}
					/>
				</div>

				<div className='form-group'>
					<label style={{ fontWeight: "bold", fontSize: "13px" }}>
						Retail Price
					</label>
					<input
						type='text'
						className='form-control'
						onChange={handleChange3}
						value={price}
					/>
				</div>

				<div className='form-group'>
					<label style={{ fontWeight: "bold", fontSize: "13px" }}>
						Price After Discount
					</label>
					<input
						type='text'
						className='form-control'
						onChange={handleChange4}
						value={priceAfterDiscount}
					/>
				</div>

				<div className='form-group'>
					<label style={{ fontWeight: "bold", fontSize: "13px" }}>
						Product Stock Level
					</label>
					<input
						type='text'
						className='form-control'
						onChange={handleChange5}
						value={stock}
					/>
				</div>

				<button
					className='btn btn-outline-primary mb-3'
					onClick={(e) => {
						e.preventDefault();
						setClickedLink("ExtraOptions");
						window.scrollTo({ top: 0, behavior: "smooth" });
					}}
				>
					Next: Add Other Features
				</button>
			</form>
		);
	};

	/* =========================================
     8) Variables
  ========================================= */
	const UpdatingProductVariableFunction = () => {
		return (
			<UpdatingProductVariable
				clickedVariableLink={clickedVariableLink}
				setClickedVariableLink={setClickedVariableLink}
				setAddVariables={setAddVariables}
				addVariables={addVariables}
				setChosenColors={setChosenColors}
				chosenColors={chosenColors}
				setChosenSizes={setChosenSizes}
				chosenSizes={chosenSizes}
				setVariablesSubmit={setVariablesSubmit}
				variablesSubmit={variablesSubmit}
				productAttributesFinal={productAttributesFinal}
				setProductAttributesFinal={setProductAttributesFinal}
				setClickedLink={setClickedLink}
				productAttributes={productAttributes}
				setAddThumbnail={setAddThumbnail}
				addThumbnail={addThumbnail}
			/>
		);
	};

	/* =========================================
     9) Extra toggles
  ========================================= */
	const extraFeatures = () => {
		return (
			<form className='mt-4 ml-5'>
				{/* Active Product */}
				<div className='form-group'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>
						Active Product
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setActiveProduct(!activeProduct)}
						checked={activeProduct}
					/>
				</div>

				{/* Shippable */}
				<div className='form-group mt-5'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>
						Shippable Product
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setShipping(!shipping)}
						checked={shipping}
					/>
				</div>

				{/* Clearance */}
				<div className='form-group mt-5'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>
						Clearance
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setClearance(!clearance)}
						checked={clearance}
					/>
				</div>

				{/* Allow Backorder */}
				<div className='form-group mt-5'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>
						Allow Backorder
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setActiveBackorder(!activeBackorder)}
						checked={activeBackorder}
					/>
				</div>

				<div className='mx-auto text-center' style={{ marginTop: "40px" }}>
					<button
						className='btn btn-success mb-3 mx-auto text-center'
						onClick={UpdateProductToDatabase}
					>
						Update Product To Your Online Store Inventory
					</button>
				</div>
			</form>
		);
	};

	/* =========================================
     10) Combine color/size => productAttributes
  ========================================= */
	const f = (a, b) => [].concat(...a.map((d) => b.map((e) => [].concat(d, e))));
	const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

	let combinationsOfColorSizes = cartesian(chosenSizes, chosenColors);
	const allPrimaryKeys = productAttributesFinal.map((i) => i.PK);

	for (let i = 1; i <= combinationsOfColorSizes.length; i++) {
		for (let ii = 1; ii < combinationsOfColorSizes[i - 1].length; ii++) {
			const sizeVal = combinationsOfColorSizes[i - 1][ii - 1];
			const colorVal = combinationsOfColorSizes[i - 1][ii];
			const PK = sizeVal + colorVal;
			const existingIndex = allPrimaryKeys.indexOf(PK);

			productAttributes.push({
				size: sizeVal,
				color: colorVal,
				quantity:
					existingIndex > -1
						? productAttributesFinal[existingIndex].quantity
						: 0,
				receivedQuantity:
					existingIndex > -1
						? productAttributesFinal[existingIndex].receivedQuantity
						: 0,
				price:
					existingIndex > -1 ? productAttributesFinal[existingIndex].price : 0,
				priceAfterDiscount:
					existingIndex > -1
						? productAttributesFinal[existingIndex].priceAfterDiscount
						: 0,
				MSRP:
					existingIndex > -1 ? productAttributesFinal[existingIndex].MSRP : 0,
				WholeSalePrice:
					existingIndex > -1
						? productAttributesFinal[existingIndex].WholeSalePrice
						: 0,
				DropShippingPrice:
					existingIndex > -1
						? productAttributesFinal[existingIndex].DropShippingPrice
						: 0,
				productImages:
					existingIndex > -1
						? productAttributesFinal[existingIndex].productImages
						: [],
				SubSKU:
					existingIndex > -1 && productAttributesFinal[existingIndex].SubSKU
						? productAttributesFinal[existingIndex].SubSKU
						: null,
				PK,
			});
		}
	}

	useEffect(() => {
		setProductAttributesFinal(productAttributes);
		// eslint-disable-next-line
	}, [variablesSubmit, chosenColors, chosenSizes]);

	/* =========================================
     11) Final Update Submission
  ========================================= */
	const UpdateProductToDatabase = (e) => {
		e.preventDefault();
		setClickedLink("MainData");
		window.scrollTo({ top: 0, behavior: "smooth" });

		// Basic checks
		if (!productName || !productSKU || !description) {
			setClickedLink("MainData");
			return toast.error("Please Add Product Main Data");
		}
		if (!chosenCategory || chosenSubcategories.length < 1 || !chosenGender) {
			setClickedLink("AddCategorySubcategory");
			return toast.error("Please Add Product Categories & Subcategories");
		}
		if (!addVariables) {
			if (!price || !priceAfterDiscount || !stock) {
				setClickedLink("AddPrices");
				return toast.error("Please add Price & Price After Discount");
			}
		}
		if (addVariables && !variablesSubmit) {
			setClickedVariableLink("SizesColorsImages");
			return toast.error("Please Submit Your Added Variables");
		}
		if (addVariables) {
			if (chosenColors.length < 1 || chosenSizes.length < 1) {
				setClickedVariableLink("SizesColorsImages");
				return toast.error("Please Add Your Product Colors & Sizes");
			}
		}
		if (!storeData || !storeData._id) {
			return toast.error("Store data is missing. Cannot update product.");
		}

		// Construct final data
		const values = {
			productName,
			productName_Arabic,
			productSKU,
			slug,
			slug_Arabic,
			description,
			description_Arabic,
			price: addVariables ? 0 : price,
			priceAfterDiscount: addVariables ? 0 : priceAfterDiscount,
			MSRPPriceBasic: addVariables ? 0 : Number(MSRPPriceBasic),
			price_unit: "USD",
			loyaltyPoints: 10,
			category: chosenCategory,
			subcategory: chosenSubcategories,
			gender: chosenGender,
			addedByEmployee: user._id,
			updatedByEmployee: user._id,
			quantity: addVariables ? 0 : stock,
			thumbnailImage: addThumbnail,
			shipping,
			addVariables,
			storeName,
			clearance,
			productAttributes: addVariables ? productAttributesFinal : [],
			// The checkbox states
			activeProductBySeller: activeProduct,
			chosenSeason,
			activeBackorder,
			geodata,
			viewsCount,
			sizeChart: sizeChart || {},
			color: mainColor,
			size: mainSize,
			brandName: selectedProductToUpdate.brandName
				? selectedProductToUpdate.brandName
				: "Serene Jannat",

			// belongsTo
			belongsTo:
				selectedProductToUpdate?.belongsTo?._id ??
				selectedProductToUpdate?.belongsTo ??
				user._id,

			// store
			store:
				selectedProductToUpdate?.store?._id ??
				selectedProductToUpdate?.store ??
				storeData._id,
		};

		updateProduct(productId, user._id, token, { product: values }).then(
			(data) => {
				if (data && data.error) {
					console.log(data.error);
				} else {
					toast.success("Product Was Successfully Updated");
					setTimeout(() => {
						window.location.reload(false);
					}, 3000);
				}
			}
		);
	};

	/* =========================================
     12) The top (left) navigation tabs
  ========================================= */
	const upperMainMenu = () => (
		<ul className='mainUL'>
			<div className='row'>
				<div className='col-3 mx-auto'>
					<li
						className='my-2 mainLi'
						onClick={() => setClickedLink("MainData")}
						style={isActive("MainData", clickedLink)}
					>
						Basic / Main Data
					</li>
				</div>

				<div className='col-3 mx-auto'>
					{!addVariables ? (
						<li
							className='my-2 mainLi'
							onClick={() => setClickedLink("AddPrices")}
							style={isActive("AddPrices", clickedLink)}
						>
							Product Prices And Stock
						</li>
					) : (
						<li
							className='my-2 mainLi'
							onClick={() => setClickedLink("AddVariables")}
							style={isActive("AddVariables", clickedLink)}
						>
							Product Attributes
						</li>
					)}
				</div>

				<div className='col-3 mx-auto'>
					<li
						className='my-2 mainLi'
						onClick={() => setClickedLink("ExtraOptions")}
						style={isActive("ExtraOptions", clickedLink)}
					>
						Product Extra Options
					</li>
				</div>
			</div>
			<div className='col-md-9 mx-auto'>
				<hr />
			</div>
		</ul>
	);

	/* =========================================
     13) Render
  ========================================= */
	return (
		<UpdateProductSingleWrapper>
			{/* If user has restricted roles, redirect */}
			{user.userRole === "Order Taker" || user.userRole === "Operations" ? (
				<Redirect to='/admin/create-new-order' />
			) : null}
			{user.userRole === "Stock Keeper" ? (
				<Redirect to='/admin/receiving' />
			) : null}

			<div className='mainContent'>
				<div className='row mt-4'>
					{/* LEFT column: Thumbnails + category */}
					<div className='col-md-3'>
						<h3
							className='ml-5'
							style={{
								color: "black",
								fontWeight: "bold",
								fontSize: "1.2rem",
								padding: "4px 2px",
								maxWidth: "80%",
							}}
						>
							Product Update Form
						</h3>

						{addVariables ? (
							<div className='ml-5'>{FileUploadThumbnail2()}</div>
						) : (
							<div className='ml-5'>{FileUploadThumbnail()}</div>
						)}

						{CategorySubcategoryEntry()}
					</div>

					{/* RIGHT column: TABS */}
					{clickedLink === "MainData" && (
						<div className='col-md-8 ml-3 rightContentWrapper'>
							{upperMainMenu()}
							{UpdateBasicDataFormFunction()}
						</div>
					)}

					{clickedLink === "AddPrices" && (
						<div className='col-8 ml-3 rightContentWrapper'>
							{upperMainMenu()}
							{AddPricesStockBasic()}
						</div>
					)}

					{clickedLink === "AddVariables" && (
						<div className='col-8 ml-3 rightContentWrapper'>
							{upperMainMenu()}
							{UpdatingProductVariableFunction()}
						</div>
					)}

					{clickedLink === "ExtraOptions" && (
						<div className='col-8 ml-3 rightContentWrapper'>
							{upperMainMenu()}
							{extraFeatures()}
						</div>
					)}
				</div>
			</div>
		</UpdateProductSingleWrapper>
	);
};

export default UpdateProductSingle;

/* =========================== STYLES =========================== */
const UpdateProductSingleWrapper = styled.div`
	min-height: 880px;
	overflow-x: hidden;

	.mainContent {
		margin-top: 50px;
	}

	.mainUL {
		list-style: none;
	}

	.mainLi {
		font-weight: bold;
		transition: 0.3s;
		cursor: pointer;
	}

	.mainLi:hover {
		background: #002a52 !important;
		padding: 1px;
		color: white !important;
		border-radius: 5px;
		transition: 0.3s;
	}

	.rightContentWrapper {
		border-left: 1px lightgrey solid;
		min-height: 550px;
	}

	.formwrapper {
		background: white !important;
		padding: 10px 20px;
		border-radius: 5px;
	}

	@media (max-width: 1550px) {
		.mainUL > li {
			font-size: 0.75rem;
			margin-left: 20px;
		}

		label {
			font-size: 0.8rem !important;
		}

		h3 {
			font-size: 1.2rem !important;
		}

		.rightContentWrapper {
			border-left: 1px lightgrey solid;
			min-height: 550px;
			margin-left: 30px !important;
		}
	}

	@media (max-width: 750px) {
		.mainUL {
			display: none;
		}
		.rightContentWrapper {
			margin-top: 20px;
			margin-left: 0px;
		}
	}
`;
