/** @format */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Select } from "antd";
import axios from "axios";
import {
	cloudinaryUpload1,
	createProduct,
	getCategories,
	getColors,
	getGenders,
	getListOfSubs,
	getProducts,
	getSizes,
	getStoreManagement,
} from "../../apiSeller";
import BasicDataForm from "./BasicDataForm";
import { isAuthenticated } from "../../../auth";
import AddingProductVariable from "./AddingProductVariable";
import { toast } from "react-toastify";
import ImageCard from "./ImageCard";

const { Option } = Select;

// Helper to style active vs. inactive links
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

const AddProduct = () => {
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
	const [chosenSubcategories, setChosenSubcategories] = useState("");
	const [chosenSeason, setChosenSeason] = useState("");
	const [chosenCategory, setChosenCategory] = useState("");
	const [chosenGender, setChosenGender] = useState("");

	// Arrays from the server
	const [allCategories, setAllCategories] = useState([]);
	const [subsOptions, setSubsOptions] = useState([]);
	const [allGenders, setAllGenders] = useState([]);
	const [allProducts, setAllProducts] = useState([]);

	// Price / stock
	const [price, setPrice] = useState("");
	const [priceAfterDiscount, setPriceAfterDiscount] = useState("");
	const [MSRPPriceBasic, setMSRPPriceBasic] = useState("");
	const [stock, setStock] = useState("");
	const [WholeSalePriceBasic, setWholePriceBasic] = useState(0);
	const [DropShippingPriceBasic, setDropShippingBasic] = useState(0);

	// Variables
	const [chosenSizes, setChosenSizes] = useState([]);
	const [chosenColors, setChosenColors] = useState([]);
	const [addVariables, setAddVariables] = useState(false);
	const [clickedVariableLink, setClickedVariableLink] =
		useState("SizesColorsImages");
	const [variablesSubmit, setVariablesSubmit] = useState(false);

	// Other toggles
	const [clearance, setClearance] = useState(false);
	const [activeBackorder, setActiveBackorder] = useState(false);
	const [shipping, setShipping] = useState(true);
	const [activeProduct, setActiveProduct] = useState(true);

	// Parent Price references
	const [parentPrice1, setParentPrice1] = useState(0);
	const [parentPrice2, setParentPrice2] = useState(0);
	const [parentPrice3, setParentPrice3] = useState(0);
	const [parentPrice4, setParentPrice4] = useState(0);
	const [parentPrice5, setParentPrice5] = useState(0);

	const [productAttributesFinal, setProductAttributesFinal] = useState([]);

	// Price / SKU inheritance
	const [inheritPrice, setInheritPrice] = useState(false);
	const [inheritParentSKU, setInheritParentSKU] = useState(false);

	// Colors / Sizes from DB
	const [allColors, setAllColors] = useState([]);
	const [allSizes, setAllSizes] = useState([]);

	// For main color/size if no variables
	const [mainColor, setMainColor] = useState("");
	const [mainSize, setMainSize] = useState("");

	// Thumbnail images
	const [addThumbnail, setAddThumbnail] = useState([]);

	// Product dimension/weight
	const [geodata, setGeodata] = useState({
		length: "",
		width: "",
		height: "",
		weight: "",
	});

	// Auth
	const { user, token } = isAuthenticated();
	const defaultUserId = user && user._id;

	// Keep track of which store owner + store ID we are using
	// eslint-disable-next-line
	const [ownerId, setOwnerId] = useState(defaultUserId);
	const [storeData, setStoreData] = useState(null); // Full store object
	const [finalStoreId, setFinalStoreId] = useState(null);

	let productAttributes = [];

	/* =========================================
     1) On mount, check localStorage for "storeData"
     ========================================= */
	useEffect(() => {
		if (!defaultUserId) return;

		const localStoreData = localStorage.getItem("storeData");
		if (localStoreData) {
			try {
				const parsedData = JSON.parse(localStoreData);

				// belongsTo can be a string or object
				let localOwnerId = parsedData.belongsTo;
				if (typeof localOwnerId === "object" && localOwnerId._id) {
					localOwnerId = localOwnerId._id;
				}

				setOwnerId(localOwnerId);
				setStoreData(parsedData); // full store object from localStorage
				setFinalStoreId(parsedData._id);
			} catch (err) {
				console.error("Error parsing storeData from localStorage:", err);
				// fallback: fetch store data from the backend
				fetchStoreData(defaultUserId);
			}
		} else {
			// If no local store data, fetch from the backend
			fetchStoreData(defaultUserId);
		}
		// eslint-disable-next-line
	}, [defaultUserId]);

	/* =========================================
     2) Once we know storeData or finalStoreId, fetch the store’s products
        Also fetch categories, genders, colors at any time
     ========================================= */
	useEffect(() => {
		// Load categories, genders, colors right away
		gettingAllCategories();
		gettingAllGenders();
		gettingAllColors();
		// Once we have storeData or finalStoreId, fetch products
		if (finalStoreId) {
			fetchAllProducts(finalStoreId);
		}
		// eslint-disable-next-line
	}, [finalStoreId]);

	// Fetch store management from the backend (if local storage not used)
	const fetchStoreData = (id) => {
		setLoading(true);
		getStoreManagement(id, token)
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					const mergedData = {
						...res,
						transactionFeePercentage: 3.5,
						activatePayOnDelivery: false,
					};
					setStoreData(mergedData);
					setFinalStoreId(mergedData._id);
				} else {
					console.error("Failed to load store management or an error occurred");
				}
			})
			.catch((err) => {
				setLoading(false);
				console.error("Error fetching store management:", err);
			});
	};

	const fetchAllProducts = (storeId) => {
		getProducts(storeId).then((data) => {
			if (data && !data.error) {
				setAllProducts(data);
			} else {
				console.error("Error fetching products or no data returned");
			}
		});
	};

	/* =========================================
     3) Get categories, genders, colors, sizes
     ========================================= */
	const gettingAllCategories = () => {
		if (!user || !user._id) return;
		getCategories(user._id, token).then((data) => {
			if (data && !data.error) {
				setAllCategories(data.filter((c) => c.categoryStatus === true));
			}
		});
	};

	const gettingAllGenders = () => {
		getGenders(token).then((data) => {
			if (data && !data.error) {
				setAllGenders(data);
			}
		});
	};

	const gettingAllColors = () => {
		getColors(token).then((data) => {
			if (data && !data.error) {
				getSizes(token).then((data2) => {
					if (data2 && !data2.error) {
						setAllSizes(data2);
					}
				});
				setAllColors(data);
			}
		});
	};

	/* =========================================
     4) Category & Subcategory
     ========================================= */
	const handleCategoryChange = (e) => {
		setChosenCategory(e.target.value);
		setChosenSubcategories([]);

		getListOfSubs(e.target.value).then((data) => {
			if (data && !data.error) {
				setSubsOptions(data);
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
						Please fill in...
					</h5>

					<label>Gender</label>
					<select
						name='gender'
						className='form-control'
						onChange={handleChangeGender}
					>
						<option>Please select</option>
						{allGenders.length > 0 &&
							allGenders.map((c) => (
								<option key={c._id} value={c._id}>
									{c.genderName}
								</option>
							))}
					</select>
				</div>

				<div className='form-group'>
					<label>Category</label>
					<select
						name='category'
						className='form-control'
						onChange={handleCategoryChange}
					>
						<option>Please select</option>
						{allCategories.map((c) => (
							<option key={c._id} value={c._id}>
								{c.categoryName}
							</option>
						))}
					</select>
				</div>

				{subsOptions && subsOptions.length > 0 && (
					<div className='form-group'>
						<label>Sub Category</label>
						<Select
							mode='multiple'
							style={{ width: "100%" }}
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
     5) Price / Stock
     ========================================= */
	const handleChange3 = (e) => setPrice(e.target.value);
	const handleChange4 = (e) => setPriceAfterDiscount(e.target.value);
	const handleChange5 = (e) => setStock(e.target.value);
	const handleChange6 = (e) => setMSRPPriceBasic(e.target.value);
	const handleChangeWholeSaleBasic = (e) => setWholePriceBasic(e.target.value);
	const handleChangeDropShippingBasic = (e) =>
		setDropShippingBasic(e.target.value);

	const AddPricesStockBasic = () => {
		return (
			<form>
				<div className='form-group mt-4'>
					<label style={{ fontWeight: "bold", fontSize: "13px" }}>
						Add Other Variables
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => {
							setAddVariables(!addVariables);
							setClickedLink("AddVariables");
						}}
						checked={addVariables === true}
					/>
				</div>

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
						Whole Sale Price
					</label>
					<input
						type='text'
						className='form-control'
						onChange={handleChangeWholeSaleBasic}
						value={WholeSalePriceBasic}
					/>
				</div>

				<div className='form-group'>
					<label style={{ fontWeight: "bold", fontSize: "13px" }}>
						Dropshipping Price
					</label>
					<input
						type='text'
						className='form-control'
						onChange={handleChangeDropShippingBasic}
						value={DropShippingPriceBasic}
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
     6) Thumbnail Upload
     ========================================= */
	const fileUploadAndResizeThumbNail = (e) => {
		let files = e.target.files;
		let updatedThumbnails = [...(addThumbnail.images || [])];

		if (files) {
			for (let i = 0; i < files.length; i++) {
				let fileSizeInMB = files[i].size / 1024 / 1024;
				if (fileSizeInMB >= 3) {
					toast.error(
						`Image #${i + 1} is more than 3MB, please try another one`
					);
					continue;
				}
				let reader = new FileReader();
				reader.readAsDataURL(files[i]);
				reader.onload = (event) => {
					let img = new Image();
					img.src = event.target.result;
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
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			)
			.then(() => {
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

	// Alternate for addVariables = true
	const fileUploadAndResizeThumbNail2 = (e) => {
		let files = e.target.files;
		let allUploadedFiles = addThumbnail;
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
				reader.onload = (event) => {
					let img = new Image();
					img.src = event.target.result;
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
							.catch((err) => {
								console.log("CLOUDINARY UPLOAD ERR", err);
							});
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
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
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
     7) Adding Product Variables
     ========================================= */
	const AddingProductVariableFunction = () => {
		return (
			<AddingProductVariable
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
				parentPrice1={parentPrice1}
				setParentPrice1={setParentPrice1}
				parentPrice2={parentPrice2}
				setParentPrice2={setParentPrice2}
				parentPrice3={parentPrice3}
				setParentPrice3={setParentPrice3}
				parentPrice4={parentPrice4}
				setParentPrice4={setParentPrice4}
				parentPrice5={parentPrice5}
				setParentPrice5={setParentPrice5}
				inheritPrice={inheritPrice}
				setInheritPrice={setInheritPrice}
				inheritParentSKU={inheritParentSKU}
				setInheritParentSKU={setInheritParentSKU}
				productSKU={productSKU}
			/>
		);
	};

	/* =========================================
     8) Generate color/size combos => productAttributes
     ========================================= */
	const f = (a, b) => [].concat(...a.map((d) => b.map((e) => [].concat(d, e))));
	const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

	let combinationsOfColorSizes = cartesian(chosenSizes, chosenColors);

	for (let i = 1; i <= combinationsOfColorSizes.length; i++) {
		for (let ii = 1; ii < combinationsOfColorSizes[i - 1].length; ii++) {
			productAttributes = [
				...productAttributes,
				{
					size: combinationsOfColorSizes[i - 1][ii - 1],
					color: combinationsOfColorSizes[i - 1][ii],
					quantity: 0,
					receivedQuantity: 0,
					price: inheritPrice ? parentPrice2 : 0,
					priceAfterDiscount: inheritPrice ? parentPrice3 : 0,
					MSRP: inheritPrice ? parentPrice1 : 0,
					WholeSalePrice: inheritPrice ? parentPrice4 : 0,
					DropShippingPrice: inheritPrice ? parentPrice5 : 0,
					productImages: [],
					SubSKU: inheritParentSKU
						? productSKU +
							"-" +
							(allColors &&
								allColors[0] &&
								allColors[
									allColors
										.map((i) => i.hexa)
										.indexOf(combinationsOfColorSizes[i - 1][ii])
								]?.color?.substring(0, 3)) +
							"-" +
							combinationsOfColorSizes[i - 1][ii - 1].substring(0, 4)
						: "",
					PK:
						combinationsOfColorSizes[i - 1][ii - 1] +
						combinationsOfColorSizes[i - 1][ii],
				},
			];
		}
	}

	useEffect(() => {
		setProductAttributesFinal(productAttributes);
		// eslint-disable-next-line
	}, [
		variablesSubmit,
		chosenSizes,
		chosenColors,
		inheritPrice,
		inheritParentSKU,
	]);

	/* =========================================
     9) Extra features toggles
     ========================================= */
	const extraFeatures = () => {
		return (
			<form className='mt-4 ml-5'>
				<div className='form-group'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>
						Active Product
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setActiveProduct(!activeProduct)}
						checked={activeProduct === true}
					/>
				</div>

				<div className='form-group mt-5'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>
						Shippable Product
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setShipping(!shipping)}
						checked={shipping === true}
					/>
				</div>

				<div className='form-group mt-5'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>Outlet</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setClearance(!clearance)}
						checked={clearance === true}
					/>
				</div>

				<div className='form-group mt-5'>
					<label style={{ fontWeight: "bold", fontSize: "17px" }}>
						Allow Backorder
					</label>
					<input
						type='checkbox'
						className='ml-2 mt-2'
						onChange={() => setActiveBackorder(!activeBackorder)}
						checked={activeBackorder === true}
					/>
				</div>

				<div className='mx-auto text-center'>
					<button
						className='btn btn-success mb-3 mx-auto text-center'
						onClick={AddProductToDatabase}
					>
						Add Product To Your Online Store Inventory
					</button>
				</div>
			</form>
		);
	};

	/* =========================================
     10) Final Add Product call
     ========================================= */
	const AddProductToDatabase = (e) => {
		e.preventDefault();
		setClickedLink("MainData");
		window.scrollTo({ top: 0, behavior: "smooth" });

		// 1) Check if we have store data & store ID
		if (!storeData || !storeData._id) {
			return toast.error("Cannot add product because store data is missing.");
		}

		// 2) Check if product limit
		if (allProducts && allProducts.length >= 300) {
			setClickedLink("MainData");
			return toast.error("Database is full, Please contact your administrator");
		}

		// 3) Validate main fields
		if (
			!productName ||
			!productName_Arabic ||
			!productSKU ||
			!description ||
			!description_Arabic ||
			!chosenSeason
		) {
			setClickedLink("MainData");
			return toast.error("Please Add Product Main Data");
		}

		if (!addThumbnail || Object.keys(addThumbnail).length === 0) {
			return toast.error("Please Add Product Main Image");
		}

		if (!chosenCategory || chosenSubcategories.length < 1 || !chosenGender) {
			return toast.error("Please Add Product Categories & Subcategories");
		}

		if (!addVariables) {
			if (!price || !priceAfterDiscount || !stock) {
				setClickedLink("AddPrices");
				return toast.error("Please fill Price & Stock fields");
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

		// 4) Construct final product object
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
			DropShippingPriceBasic: addVariables ? 0 : DropShippingPriceBasic,
			WholeSalePriceBasic: addVariables ? 0 : WholeSalePriceBasic,
			price_unit: "USD",
			loyaltyPoints: 10,
			category: chosenCategory,
			subcategory: chosenSubcategories,
			gender: chosenGender,
			addedByEmployee: user._id, // The user adding the product
			updatedByEmployee: user._id,
			quantity: addVariables ? 0 : stock,
			thumbnailImage: addThumbnail,
			relatedProducts: [],
			shipping,
			addVariables,
			clearance,
			activeBackorder,
			productAttributes: addVariables ? productAttributesFinal : [],
			activeProductBySeller: activeProduct,
			chosenSeason,
			featuredProduct: false,
			color: mainColor,
			size: mainSize,
			brandName:
				storeData && storeData.addStoreName
					? storeData.addStoreName
					: "Serene Jannat",
			geodata,
			policy: "",
			policy_Arabic: "",
			DNA: "",
			DNA_Arabic: "",
			Specs: "",
			Specs_Arabic: "",
			fitCare: "",
			fitCare_Arabic: "",

			// The crucial part:
			belongsTo: storeData.belongsTo, // or ownerId, but you wanted storeData.belongsTo explicitly
			store: storeData._id, // final store ID
		};

		createProduct(user._id, token, values).then((data) => {
			if (data && data.error) {
				console.log(data.error);
			} else {
				toast.success("Product Was Successfully Added");
				setTimeout(() => {
					window.location.reload(false);
				}, 3000);
			}
		});
	};

	/* =========================================
     11) Basic Data Form
     ========================================= */
	const BasicDataFormFunction = () => (
		<BasicDataForm
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
			parentPrice1={parentPrice1}
			setParentPrice1={setParentPrice1}
			parentPrice2={parentPrice2}
			setParentPrice2={setParentPrice2}
			parentPrice3={parentPrice3}
			setParentPrice3={setParentPrice3}
			parentPrice4={parentPrice4}
			setParentPrice4={setParentPrice4}
			parentPrice5={parentPrice5}
			setParentPrice5={setParentPrice5}
			inheritPrice={inheritPrice}
			setInheritPrice={setInheritPrice}
			inheritParentSKU={inheritParentSKU}
			setInheritParentSKU={setInheritParentSKU}
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
     12) Nav Menu
     ========================================= */
	const upperMainMenu = () => {
		return (
			<ul className='mainUL'>
				<div className='row'>
					<div className='col-3 mx-auto'>
						<li
							className='my-2 mainLi'
							onClick={() => setClickedLink("MainData")}
							style={isActive("MainData", clickedLink)}
						>
							Basic/ Main Data
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
	};

	/* =========================================
     RENDER
     ========================================= */
	return (
		<AddProductWrapper>
			<div className='mainContent'>
				<div className='row mt-4'>
					{/* LEFT COLUMN: thumbnails + category selection */}
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
							Product Form
						</h3>

						{/* If addVariables => different thumbnail approach */}
						<div className='ml-5 '>
							{addVariables ? FileUploadThumbnail2() : FileUploadThumbnail()}
						</div>

						{CategorySubcategoryEntry()}
					</div>

					{/* RIGHT COLUMN: main tabbed content */}
					{clickedLink === "MainData" && (
						<div className='col-md-8 ml-3 rightContentWrapper'>
							{upperMainMenu()}
							{BasicDataFormFunction()}
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
							{AddingProductVariableFunction()}
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
		</AddProductWrapper>
	);
};

export default AddProduct;

/* =================================================
   STYLES
================================================= */
const AddProductWrapper = styled.div`
	min-height: 880px;
	overflow-x: hidden;
	margin-bottom: 20px;

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
		.rightContentWrapper {
			margin-top: 20px;
			margin-left: 0px;
		}
		.mainUL {
			display: none;
		}
	}
`;
