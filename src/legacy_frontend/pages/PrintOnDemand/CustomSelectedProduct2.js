import React, { useEffect, useState, useRef, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
	Button,
	Row,
	Col,
	Typography,
	Input,
	Select,
	message,
	Skeleton,
	Divider,
	Popover,
	InputNumber,
	Modal,
} from "antd";
import Slider from "react-slick";
import { useDropzone } from "react-dropzone";
import {
	DeleteOutlined,
	FontColorsOutlined,
	BoldOutlined,
	ItalicOutlined,
	BgColorsOutlined,
	UpOutlined,
	DownOutlined,
	ShoppingCartOutlined,
	EditOutlined,
	CloudUploadOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import PrintifyCheckoutModal from "./PrintifyCheckoutModal"; // Adjust path if needed
import { isAuthenticated } from "../../auth";
import { cloudinaryUpload1 } from "../../apiCore"; // Adjust path if needed

import html2canvas from "html2canvas";
import { useCartContext } from "../../cart_context";
import { Rnd } from "react-rnd";
import { Helmet } from "react-helmet-async";
import ReactGA from "react-ga4";

const { Title } = Typography;
const { Option } = Select;

/** Strip HTML tags */
function stripHtmlTags(html) {
	if (!html) return "";
	return html.replace(/<[^>]*>?/gm, "");
}

/** Truncate text by word count */
function truncateText(text, wordLimit) {
	const words = text.split(/\s+/);
	if (words.length <= wordLimit) return text;
	return words.slice(0, wordLimit).join(" ") + "...";
}

/**
 * Helper that scans a <canvas> for fully transparent pixels
 * around the edges and returns a newly cropped canvas bounding
 * just the design itself.
 */
function cropCanvasToTransparentBounds(originalCanvas) {
	const ctx = originalCanvas.getContext("2d");
	const { width, height } = originalCanvas;
	const imageData = ctx.getImageData(0, 0, width, height).data;

	let top = 0,
		bottom = height,
		left = 0,
		right = width;

	// top
	topLoop: for (; top < height; top++) {
		for (let x = 0; x < width; x++) {
			const idx = (top * width + x) * 4 + 3; // alpha channel
			if (imageData[idx] !== 0) break topLoop;
		}
	}
	// bottom
	bottomLoop: for (; bottom > top; bottom--) {
		for (let x = 0; x < width; x++) {
			const idx = ((bottom - 1) * width + x) * 4 + 3;
			if (imageData[idx] !== 0) break bottomLoop;
		}
	}
	// left
	leftLoop: for (; left < width; left++) {
		for (let y = top; y < bottom; y++) {
			const idx = (y * width + left) * 4 + 3;
			if (imageData[idx] !== 0) break leftLoop;
		}
	}
	// right
	rightLoop: for (; right > left; right--) {
		for (let y = top; y < bottom; y++) {
			const idx = (y * width + (right - 1)) * 4 + 3;
			if (imageData[idx] !== 0) break rightLoop;
		}
	}

	const croppedWidth = right - left;
	const croppedHeight = bottom - top;
	if (croppedWidth <= 0 || croppedHeight <= 0) {
		// everything is transparent => return original
		return originalCanvas;
	}

	const newCanvas = document.createElement("canvas");
	newCanvas.width = croppedWidth;
	newCanvas.height = croppedHeight;
	const newCtx = newCanvas.getContext("2d");
	newCtx.putImageData(
		ctx.getImageData(left, top, croppedWidth, croppedHeight),
		0,
		0
	);
	return newCanvas;
}

export default function CustomizeSelectedProduct() {
	const { productId } = useParams();
	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);

	const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
	const [selectedColor, setSelectedColor] = useState("");
	const [selectedSize, setSelectedSize] = useState("");
	const [userText, setUserText] = useState("");

	// Text styling
	const [textColor, setTextColor] = useState("#000000");
	const [fontFamily, setFontFamily] = useState("Arial");
	const [fontSize, setFontSize] = useState(24);
	const [fontWeight, setFontWeight] = useState("normal");
	const [fontStyle, setFontStyle] = useState("normal");
	const [borderRadius, setBorderRadius] = useState(0);

	// Elements array
	const [elements, setElements] = useState([]);
	const [selectedElementId, setSelectedElementId] = useState(null);

	// Inline text editing
	const [inlineEditId, setInlineEditId] = useState(null);
	const [inlineEditText, setInlineEditText] = useState("");

	// The order object
	const [order, setOrder] = useState({
		product_id: null,
		variant_id: null,
		customizations: { texts: [], images: [] },
		recipient: {
			name: "",
			address1: "",
			city: "",
			state: "",
			zip: "",
			country: "",
			phone: "",
			email: "",
		},
		shipping_method: "",
	});

	// Mobile vs desktop
	const [isMobile, setIsMobile] = useState(window.innerWidth < 800);
	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 800);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Cart context
	const { addToCart, openSidebar2 } = useCartContext();
	const { user, token } = isAuthenticated();

	// Refs
	const sliderRef = useRef(null);
	const designOverlayRef = useRef(null);
	const bareDesignRef = useRef(null);
	const printAreaRef = useRef(null);
	const barePrintAreaRef = useRef(null);

	// “Add Text” on mobile
	const [textModalVisible, setTextModalVisible] = useState(false);
	const [mobileTextInput, setMobileTextInput] = useState("");

	// File input on mobile
	const hiddenFileInputRef = useRef(null);

	// Dropzone on desktop
	const { getRootProps, getInputProps } = useDropzone({
		accept: { "image/*": [] },
		onDrop: (acceptedFiles) => {
			ReactGA.event({
				category: "User Uploaded Image In Custom Design",
				action: "User Uploaded Image In Custom Design",
				label: `User Uploaded Image In Custom Design`,
			});
			acceptedFiles.forEach((file) => {
				addImageElement(file);
			});
		},
	});

	// For disabling Add to Cart while capturing screenshots
	const [isAddToCartDisabled, setIsAddToCartDisabled] = useState(false);

	// Tooltip for text
	const [showTooltipForText, setShowTooltipForText] = useState(null);

	// Rotation
	const [isRotating, setIsRotating] = useState(false);
	const rotationData = useRef({
		rotatingElementId: null,
		startAngle: 0,
		startRotation: 0,
	});

	// One-time default text
	const [defaultTextAdded, setDefaultTextAdded] = useState(false);

	// (2) ===> ADD 1-SECOND FADE-IN FOR MOBILE BUTTONS
	const [showMobileButtons, setShowMobileButtons] = useState(false);
	useEffect(() => {
		if (isMobile) {
			setTimeout(() => {
				setShowMobileButtons(true);
			}, 1000);
		}
	}, [isMobile]);

	// LOAD PRODUCT
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "smooth" });
		const fetchProduct = async () => {
			try {
				const response = await axios.get(
					`${process.env.REACT_APP_API_URL}/product/${productId}`
				);
				if (!response.data) {
					message.error("Product not found or no data returned.");
					setLoading(false);
					return;
				}
				let fetchedProduct = {
					...response.data,
					variants: response.data.printifyProductDetails?.variants || [],
					options: response.data.printifyProductDetails?.options || [],
					images: response.data.printifyProductDetails?.images || [],
					title:
						response.data.printifyProductDetails?.title ||
						response.data.productName,
					description:
						response.data.printifyProductDetails?.description ||
						response.data.description ||
						"",
				};

				// Filter out invalid variants
				const validVariants = fetchedProduct.variants.filter(
					(variant) => typeof variant.price === "number" && variant.price > 0
				);
				if (!validVariants.length) {
					message.error(
						"No valid variants with pricing were found for this product."
					);
					setLoading(false);
					return;
				}
				fetchedProduct.variants = validVariants;

				// Filter color options
				const colorOptionIndex = fetchedProduct.options.findIndex(
					(opt) => opt.name.toLowerCase() === "colors"
				);
				if (colorOptionIndex !== -1) {
					fetchedProduct.options[colorOptionIndex].values =
						fetchedProduct.options[colorOptionIndex].values.filter(
							(colorValue) =>
								validVariants.some((variant) =>
									variant.options.includes(colorValue.id)
								)
						);
				}

				// Filter size options
				const sizeOptionIndex = fetchedProduct.options.findIndex(
					(opt) => opt.name.toLowerCase() === "sizes"
				);
				if (sizeOptionIndex !== -1) {
					fetchedProduct.options[sizeOptionIndex].values =
						fetchedProduct.options[sizeOptionIndex].values.filter((sizeValue) =>
							validVariants.some((variant) =>
								variant.options.includes(sizeValue.id)
							)
						);
				}

				setProduct(fetchedProduct);

				// Default color/size
				const colorOption = fetchedProduct.options.find(
					(opt) => opt.name.toLowerCase() === "colors"
				);
				const sizeOption = fetchedProduct.options.find(
					(opt) => opt.name.toLowerCase() === "sizes"
				);
				if (colorOption?.values?.length > 0) {
					const uniqueColorTitles = [
						...new Set(colorOption.values.map((c) => c.title)),
					];
					setSelectedColor(uniqueColorTitles[0]);
				}
				if (sizeOption?.values?.length > 0) {
					setSelectedSize(sizeOption.values[0].title);
				}

				setLoading(false);
			} catch (err) {
				console.error(err);
				message.error("Failed to load product details.");
				setLoading(false);
			}
		};
		fetchProduct();
	}, [productId]);

	// ADD A DEFAULT TEXTBOX IN THE MIDDLE OF THE PRINT AREA
	useEffect(() => {
		if (!product || defaultTextAdded) return;
		if (!printAreaRef.current) return;

		const boundingRect = printAreaRef.current.getBoundingClientRect();
		const boxWidth = 200;
		const boxHeight = 100;

		const centerX = boundingRect.width / 2 - boxWidth / 2;
		const centerY = boundingRect.height / 2 - boxHeight / 1;

		const newEl = {
			id: Date.now(),
			type: "text",
			text: "Start typing here...",
			color: "#000000",
			backgroundColor: "transparent",
			fontFamily: "Arial",
			fontSize: 20,
			fontWeight: "normal",
			fontStyle: "normal",
			borderRadius: 0,
			rotation: 0,
			x: centerX,
			y: centerY,
			width: boxWidth,
			height: boxHeight,
			wasReset: false,
		};

		setElements((prev) => [...prev, newEl]);
		setDefaultTextAdded(true);
	}, [product, defaultTextAdded]);

	// DETERMINE VARIANT ID
	useEffect(() => {
		if (!product || !selectedColor || !selectedSize) return;
		const matchingVariant = product.variants.find((variant) => {
			const colorOption = product.options.find(
				(opt) => opt.name.toLowerCase() === "colors"
			);
			const sizeOption = product.options.find(
				(opt) => opt.name.toLowerCase() === "sizes"
			);
			const selectedColorValue = colorOption?.values.find(
				(val) => val.title === selectedColor
			);
			const selectedSizeValue = sizeOption?.values.find(
				(val) => val.title === selectedSize
			);
			if (!selectedColorValue || !selectedSizeValue) return false;
			return (
				variant.options.includes(selectedColorValue.id) &&
				variant.options.includes(selectedSizeValue.id)
			);
		});
		setOrder((prev) => ({ ...prev, variant_id: matchingVariant?.id || null }));
	}, [product, selectedColor, selectedSize]);

	// ADD ELEMENTS
	const addTextElement = (textValue) => {
		const finalText = textValue ? textValue.trim() : userText.trim();
		if (!finalText) {
			message.warning("Please enter some text first.");
			return;
		}
		if (!printAreaRef.current) return;

		const boundingRect = printAreaRef.current.getBoundingClientRect();
		const boxWidth = 200;
		const boxHeight = 100;
		const centerX = boundingRect.width / 2 - boxWidth / 2;
		const centerY = boundingRect.height / 2 - boxHeight / 2;

		const newId = Date.now();
		const newEl = {
			id: newId,
			type: "text",
			text: finalText,
			color: textColor,
			backgroundColor: "transparent",
			fontFamily,
			fontSize,
			fontWeight,
			fontStyle,
			borderRadius,
			rotation: 0,
			x: centerX,
			y: centerY,
			width: boxWidth,
			height: boxHeight,
			wasReset: false,
		};
		setElements((prev) => [...prev, newEl]);
		setSelectedElementId(newId);
	};

	const addImageElement = async (file) => {
		const hasColorOption = product?.options.find(
			(opt) => opt.name.toLowerCase() === "colors"
		);
		const hasSizeOption = product?.options.find(
			(opt) => opt.name.toLowerCase() === "sizes"
		);
		if (
			(hasColorOption && !selectedColor) ||
			(hasSizeOption && !selectedSize)
		) {
			message.warning("Please select required options before customizing.");
			return;
		}
		try {
			const resizedImage = await resizeImage(file, 1200);
			const base64Image = await convertToBase64(resizedImage);
			const { public_id, url } = await cloudinaryUpload1(user._id, token, {
				image: base64Image,
			});
			if (!public_id || !url) {
				throw new Error("Missing public_id or url in upload response");
			}
			if (!printAreaRef.current) return;

			const boundingRect = printAreaRef.current.getBoundingClientRect();
			const imgWidth = 150;
			const imgHeight = 200;

			const centerX = boundingRect.width / 2 - imgWidth / 2;
			const centerY = boundingRect.height / 2 - imgHeight / 2;

			const newId = Date.now();
			const removedBg = removeImageBackground(url);

			const newImgEl = {
				id: newId,
				type: "image",
				src: url,
				public_id,
				rotation: 0,
				x: centerX,
				y: centerY,
				width: imgWidth,
				height: imgHeight,
				borderRadius: 0,
				originalSrc: url,
				removedBgSrc: removedBg,
				bgRemoved: false,
				wasReset: false,
			};
			setElements((prev) => [...prev, newImgEl]);
			setSelectedElementId(newId);
		} catch (error) {
			console.error("Image upload failed:", error);
			message.error("Failed to upload image. Please try again.");
		}
	};

	function removeImageBackground(oldUrl) {
		if (!oldUrl.includes("/upload/")) {
			return oldUrl;
		}
		return oldUrl.replace("/upload/", "/upload/e_background_removal/");
	}

	function resizeImage(file, maxSize) {
		return new Promise((resolve, reject) => {
			let img = new Image();
			let canvas = document.createElement("canvas");
			let reader = new FileReader();

			reader.readAsDataURL(file);
			reader.onload = (e) => {
				img.src = e.target.result;
				img.onload = () => {
					let width = img.width;
					let height = img.height;

					if (width > height) {
						if (width > maxSize) {
							height *= maxSize / width;
							width = maxSize;
						}
					} else {
						if (height > maxSize) {
							width *= maxSize / height;
							height = maxSize;
						}
					}

					canvas.width = width;
					canvas.height = height;
					let ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0, width, height);

					canvas.toBlob(
						(blob) => {
							if (!blob) {
								console.error("Canvas is empty");
								return;
							}
							let resizedFile = new File([blob], file.name, {
								type: "image/jpeg",
								lastModified: Date.now(),
							});
							resolve(resizedFile);
						},
						"image/jpeg",
						1
					);
				};
				img.onerror = (error) => reject(error);
			};
			reader.onerror = (error) => reject(error);
		});
	}

	function convertToBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result);
			reader.onerror = (error) => reject(error);
		});
	}

	// SELECT / DESELECT / EDIT / DELETE
	function handleElementClick(el) {
		// Bring to top
		setElements((prev) => {
			const withoutClicked = prev.filter((item) => item.id !== el.id);
			return [...withoutClicked, el];
		});
		setSelectedElementId(el.id);

		if (el.type === "text") {
			setUserText(el.text || "");
			setTextColor(el.color || "#000000");
			setFontFamily(el.fontFamily || "Arial");
			setFontSize(el.fontSize || 24);
			setFontWeight(el.fontWeight || "normal");
			setFontStyle(el.fontStyle || "normal");
			setBorderRadius(el.borderRadius || 0);
		} else if (el.type === "image") {
			setBorderRadius(el.borderRadius || 0);
		}
	}

	// (1) ===> OVERWRITE "Start typing here..." WHEN USER DOUBLE CLICKS (OR DOUBLE TAPS)
	function handleTextDoubleClick(el) {
		// If it’s still the default “Start typing here...”, remove it immediately:
		if (el.text === "Start typing here...") {
			setElements((prev) =>
				prev.map((item) => (item.id === el.id ? { ...item, text: "" } : item))
			);
			setInlineEditText(""); // start with empty text so user doesn't backspace
		} else {
			setInlineEditText(el.text);
		}
		setInlineEditId(el.id);
	}

	// Double-tap for mobile
	const lastTapTime = useRef(0);
	function handleTextTouchEnd(el) {
		if (!isMobile) return;
		const now = Date.now();
		if (now - lastTapTime.current < 300) {
			handleTextDoubleClick(el);
		}
		lastTapTime.current = now;
	}

	function handleInlineEditSave(elId) {
		setElements((prev) =>
			prev.map((item) =>
				item.id === elId ? { ...item, text: inlineEditText } : item
			)
		);
		setInlineEditId(null);
	}

	async function deleteSelectedElement(elId) {
		const el = elements.find((x) => x.id === elId);
		if (!el) return;

		if (el.type === "image" && el.public_id) {
			try {
				const userId = user && user._id;
				if (!userId) {
					message.error("User not authenticated.");
					return;
				}
				await axios.post(
					`${process.env.REACT_APP_API_URL}/admin/removeimage/${userId}`,
					{ public_id: el.public_id },
					{ headers: { Authorization: `Bearer ${token}` } }
				);
				message.success("Image Successfully Deleted.");
			} catch (error) {
				console.error("Failed to delete image from Cloudinary:", error);
				message.error("Failed to delete image.");
			}
		}

		setElements((prev) => prev.filter((item) => item.id !== elId));
		setSelectedElementId(null);
	}

	// RND DRAG/RESIZE

	// --------------------------------------------------------------------
	// The new state & function to detect horizontal center (ADDED)
	// --------------------------------------------------------------------
	const [showCenterLine, setShowCenterLine] = useState(false); // <-- ADDED

	function handleRndDrag(e, data, elId) {
		// <-- ADDED
		if (!printAreaRef.current) return;
		const boundingRect = printAreaRef.current.getBoundingClientRect();
		const containerCenterX = boundingRect.width / 2;

		// Find the element so we know its width
		const theElement = elements.find((x) => x.id === elId);
		if (!theElement) return;

		// The center of the element relative to the container
		const elementCenterX = data.x + theElement.width / 2;

		// If it's "close" to containerCenterX, we show the line
		const isCentered = Math.abs(elementCenterX - containerCenterX) < 5;
		setShowCenterLine(isCentered);
	}

	function handleRndDragStop(e, data, elId) {
		setShowCenterLine(false); // <-- ADDED to hide once user stops
		setElements((prev) =>
			prev.map((item) =>
				item.id === elId ? { ...item, x: data.x, y: data.y } : item
			)
		);
	}

	function handleRndResizeStop(e, direction, ref, delta, position, elId) {
		const newWidth = parseInt(ref.style.width, 10);
		const newHeight = parseInt(ref.style.height, 10);
		setElements((prev) =>
			prev.map((item) =>
				item.id === elId
					? {
							...item,
							x: position.x,
							y: position.y,
							width: newWidth,
							height: newHeight,
						}
					: item
			)
		);
	}

	const DRAGGABLE_REGION_CLASS = "drag-handle";

	// ROTATION
	function onRotationStart(evt, elId) {
		evt.stopPropagation();
		evt.preventDefault();

		rotationData.current.rotatingElementId = elId;
		const el = elements.find((x) => x.id === elId);
		if (!el) return;
		setIsRotating(true);

		const printAreaBounds = printAreaRef.current.getBoundingClientRect();
		const centerX = printAreaBounds.left + el.x + el.width / 2;
		const centerY = printAreaBounds.top + el.y + el.height / 2;

		const pointer = getPointerXY(evt);
		const angleToPointer = Math.atan2(pointer.y - centerY, pointer.x - centerX);
		rotationData.current.startAngle = angleToPointer;
		rotationData.current.startRotation = el.rotation || 0;

		document.addEventListener("mousemove", onRotationMove, { passive: false });
		document.addEventListener("touchmove", onRotationMove, { passive: false });
		document.addEventListener("mouseup", onRotationEnd, { passive: false });
		document.addEventListener("touchend", onRotationEnd, { passive: false });
	}

	function onRotationMove(evt) {
		const { rotatingElementId, startAngle, startRotation } =
			rotationData.current;
		if (!rotatingElementId) return;

		evt.preventDefault();
		const el = elements.find((x) => x.id === rotatingElementId);
		if (!el) return;

		const printAreaBounds = printAreaRef.current.getBoundingClientRect();
		const centerX = printAreaBounds.left + el.x + el.width / 2;
		const centerY = printAreaBounds.top + el.y + el.height / 2;

		const pointer = getPointerXY(evt);
		const angleNow = Math.atan2(pointer.y - centerY, pointer.x - centerX);
		const diff = angleNow - startAngle;
		const newRotationDeg = startRotation + diff * (180 / Math.PI);

		setElements((prev) =>
			prev.map((item) =>
				item.id === rotatingElementId
					? { ...item, rotation: newRotationDeg }
					: item
			)
		);
	}

	function onRotationEnd() {
		setIsRotating(false);
		rotationData.current = {
			rotatingElementId: null,
			startAngle: 0,
			startRotation: 0,
		};
		document.removeEventListener("mousemove", onRotationMove);
		document.removeEventListener("touchmove", onRotationMove);
		document.removeEventListener("mouseup", onRotationEnd);
		document.removeEventListener("touchend", onRotationEnd);
	}

	function getPointerXY(evt) {
		if (evt.touches && evt.touches.length > 0) {
			return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
		}
		return { x: evt.clientX, y: evt.clientY };
	}

	// PRICE
	function getVariantPrice() {
		if (!product || !product.variants) return 0;
		const matchingVariant = product.variants.find((v) => {
			const colorOption = product.options.find(
				(opt) => opt.name.toLowerCase() === "colors"
			);
			const sizeOption = product.options.find(
				(opt) => opt.name.toLowerCase() === "sizes"
			);

			let colorValue, sizeValue;
			if (colorOption) {
				colorValue = colorOption.values.find(
					(val) => val.title === selectedColor
				);
			}
			if (sizeOption) {
				sizeValue = sizeOption.values.find((val) => val.title === selectedSize);
			}
			if (!colorValue && !sizeValue) return false;

			const variantOptionIds = [];
			if (colorValue) variantOptionIds.push(colorValue.id);
			if (sizeValue) variantOptionIds.push(sizeValue.id);

			return variantOptionIds.every((id) => v.options.includes(id));
		});

		if (matchingVariant && matchingVariant.price !== null) {
			return parseFloat(matchingVariant.price / 100);
		}
		if (product.basePrice !== null) {
			return parseFloat(product.basePrice / 100);
		}
		return 0;
	}
	const displayedPrice = `$${getVariantPrice().toFixed(2)}`;

	// FILTERED IMAGES
	const uniqueColorsForDropdown = useMemo(() => {
		if (!product) return [];
		const colorOption = product.options.find(
			(opt) => opt.name.toLowerCase() === "colors"
		);
		if (!colorOption) return [];
		const uniqueTitles = new Set(colorOption.values.map((c) => c.title));
		return Array.from(uniqueTitles);
	}, [product]);

	const filteredImages = useMemo(() => {
		if (!product) return [];
		if (!selectedColor) return product.images.slice(0, 6);

		const colorOption = product.options.find(
			(opt) => opt.name.toLowerCase() === "colors"
		);
		if (!colorOption) return product.images.slice(0, 6);

		const colorValue = colorOption.values.find(
			(val) => val.title === selectedColor
		);
		if (!colorValue) return product.images.slice(0, 6);

		const matchingVariants = product.variants.filter((v) =>
			v.options.includes(colorValue.id)
		);
		const matchingVariantIds = matchingVariants.map((v) => v.id);
		const filtered = product.images.filter((img) =>
			img.variant_ids.some((id) => matchingVariantIds.includes(id))
		);

		return filtered.length > 0
			? filtered.slice(0, 6)
			: product.images.slice(0, 6);
	}, [selectedColor, product]);

	// CAROUSEL SETTINGS
	const sliderSettings = {
		ref: sliderRef,
		dots: true,
		infinite: false,
		speed: 500,
		slidesToShow: 1,
		slidesToScroll: 1,
		initialSlide: 0,
		draggable: false,
		swipe: false,
		touchMove: false,
	};
	useEffect(() => {
		if (sliderRef.current) {
			sliderRef.current.slickGoTo(0);
		}
	}, [filteredImages]);

	// UPDATE ORDER ON CHANGES
	useEffect(() => {
		const texts = elements
			.filter((el) => el.type === "text")
			.map((el) => ({
				text: el.text,
				color: el.color,
				background_color: el.backgroundColor,
				font_family: el.fontFamily,
				font_size: el.fontSize,
				font_weight: el.fontWeight,
				font_style: el.fontStyle,
				border_radius: el.borderRadius,
				rotation: el.rotation,
				position: { x: el.x, y: el.y },
				was_reset: el.wasReset || false,
			}));
		const images = elements
			.filter((el) => el.type === "image")
			.map((el) => ({
				image_url: el.src,
				position: { x: el.x, y: el.y },
				width: el.width,
				height: el.height,
				rotation: el.rotation,
				border_radius: el.borderRadius || 0,
				bg_removed: el.bgRemoved || false,
				was_reset: el.wasReset || false,
			}));

		setOrder((prev) => ({
			...prev,
			customizations: { texts, images },
		}));
	}, [elements]);

	// GLOBAL CLICK => DESELECT
	useEffect(() => {
		function handleGlobalClick(e) {
			if (!selectedElementId) return;
			if (
				e.target.closest(".rnd-element") ||
				e.target.closest(".text-toolbar") ||
				e.target.closest(".image-toolbar") ||
				e.target.closest(".ant-popover") ||
				e.target.closest(".ant-select-dropdown")
			) {
				return;
			}
			setSelectedElementId(null);
		}
		document.addEventListener("mousedown", handleGlobalClick);
		document.addEventListener("touchstart", handleGlobalClick);
		return () => {
			document.removeEventListener("mousedown", handleGlobalClick);
			document.removeEventListener("touchstart", handleGlobalClick);
		};
	}, [selectedElementId]);

	// ADD TO CART => SCREENSHOTS
	const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);

	async function handleAddToCart() {
		if (isAddToCartDisabled) return;
		if (!order.variant_id) {
			message.warning("Please select required options before adding to cart.");
			return;
		}

		setIsAddToCartDisabled(true);

		// *** KEY CHANGE: Temporarily deselect any element so no dotted border is visible. ***
		const previouslySelected = selectedElementId;
		setSelectedElementId(null);
		// Force a tiny re-render
		await new Promise((resolve) => setTimeout(resolve, 50));

		try {
			const screenshotOptions = {
				scale: 3,
				useCORS: true,
				allowTaint: true,
				// ignore dotted overlays etc.
				ignoreElements: (element) =>
					element.classList?.contains("noScreenshot"),
				backgroundColor: null,
			};
			if (isMobile) {
				screenshotOptions.scale = 2;
			}

			// #1) Screenshot of bareDesignRef
			const bareCanvas = await html2canvas(
				bareDesignRef.current,
				screenshotOptions
			);
			const croppedBareCanvas = cropCanvasToTransparentBounds(bareCanvas);
			const bareDataURL = croppedBareCanvas.toDataURL("image/png");
			const { url: bareUrl } = await cloudinaryUpload1(user._id, token, {
				image: bareDataURL,
			});

			// #2) Screenshot of final design overlay
			const finalCanvas = await html2canvas(
				designOverlayRef.current,
				screenshotOptions
			);
			const finalDataURL = finalCanvas.toDataURL("image/png");
			const { url: finalUrl } = await cloudinaryUpload1(user._id, token, {
				image: finalDataURL,
			});

			// #3) Attempt to find product variant image
			let variantImage = "";
			let matchingVariant = null;
			if (product?.options && product?.variants && product?.images) {
				const colorOption = product.options.find(
					(opt) => opt.name.toLowerCase() === "colors"
				);
				const sizeOption = product.options.find(
					(opt) => opt.name.toLowerCase() === "sizes"
				);
				const selectedColorValue = colorOption?.values.find(
					(val) => val.title === selectedColor
				);
				const selectedSizeValue = sizeOption?.values.find(
					(val) => val.title === selectedSize
				);
				if (selectedColorValue && selectedSizeValue) {
					matchingVariant = product.variants.find(
						(v) =>
							v.options.includes(selectedColorValue.id) &&
							v.options.includes(selectedSizeValue.id)
					);
					if (matchingVariant && product.images) {
						const matchingImageObj = product.images.find((img) =>
							img.variant_ids?.includes(matchingVariant.id)
						);
						if (matchingImageObj) {
							variantImage = matchingImageObj.src;
						}
					}
				}
			}
			const firstImageElement = elements.find((el) => el.type === "image");
			const originalPrintifyImageURL =
				variantImage || (firstImageElement ? firstImageElement.src : "");

			const colorOption = product.options.find(
				(opt) => opt.name.toLowerCase() === "colors"
			);
			const sizeOption = product.options.find(
				(opt) => opt.name.toLowerCase() === "sizes"
			);
			const chosenColorVariant = colorOption?.values.find(
				(val) => val.title === selectedColor
			);
			const chosenSizeVariant = sizeOption?.values.find(
				(val) => val.title === selectedSize
			);

			let finalPrice = 0;
			let finalPriceAfterDiscount = 0;
			if (matchingVariant && typeof matchingVariant.price === "number") {
				finalPrice = matchingVariant.price / 100;
				finalPriceAfterDiscount = finalPrice;
			} else {
				finalPrice = product.price || 0;
				finalPriceAfterDiscount = product.priceAfterDiscount || finalPrice;
			}

			const customDesign = {
				bareScreenshotUrl: bareUrl,
				finalScreenshotUrl: finalUrl,
				texts: order.customizations.texts,
				images: order.customizations.images,
				originalPrintifyImageURL,
				size: selectedSize,
				color: selectedColor,
				variants: { color: chosenColorVariant, size: chosenSizeVariant },
				printArea: "front",
				PrintifyProductId: product.printifyProductDetails?.id || null,
			};

			const chosenProductAttributes = {
				SubSKU: String(Date.now()),
				color: selectedColor,
				size: selectedSize,
				quantity: 999,
				productImages: [],
				price: finalPrice,
				priceAfterDiscount: finalPriceAfterDiscount,
			};

			addToCart(
				product._id,
				selectedColor,
				1,
				product,
				chosenProductAttributes,
				customDesign
			);

			ReactGA.event({
				category: "Add To The Cart Custom Products",
				action: "User Added Product From The Custom Products",
				label: `User added ${product.productName} to the cart from Custom Products`,
			});

			openSidebar2();
			message.success("Added to cart with custom design!");
		} catch (error) {
			console.error("Screenshot or upload failed:", error);
			message.error("Failed to capture your design. Please try again.");
		} finally {
			// restore any previously selected element
			setSelectedElementId(previouslySelected);
			setIsAddToCartDisabled(false);
		}
	}

	// REMOVE BG / RESET
	function handleRemoveBgToggle(elementId) {
		setElements((prev) =>
			prev.map((item) => {
				if (item.id !== elementId) return item;
				if (item.type !== "image") return item;
				const currentlyRemoved = item.bgRemoved;
				return {
					...item,
					bgRemoved: !currentlyRemoved,
					src: currentlyRemoved ? item.originalSrc : item.removedBgSrc,
				};
			})
		);
	}

	function handleResetStyling(elId) {
		setElements((prev) =>
			prev.map((item) => {
				if (item.id !== elId) return item;
				return {
					...item,
					rotation: 0,
					borderRadius: 0,
					backgroundColor:
						item.type === "text" ? "transparent" : item.backgroundColor,
					wasReset: true,
				};
			})
		);
	}

	// Show 5s tooltip on text selection
	useEffect(() => {
		if (selectedElementId) {
			const el = elements.find((e) => e.id === selectedElementId);
			if (el && el.type === "text") {
				setShowTooltipForText(selectedElementId);
				const timer = setTimeout(() => {
					setShowTooltipForText(null);
				}, 5000);
				return () => clearTimeout(timer);
			}
		}
		setShowTooltipForText(null);
	}, [selectedElementId, elements]);

	// RENDER
	if (loading) {
		return (
			<CustomizeWrapper>
				<Skeleton active />
			</CustomizeWrapper>
		);
	}
	if (!product) {
		return (
			<CustomizeWrapper>
				<Title level={3} style={{ textAlign: "center" }}>
					Product not found.
				</Title>
			</CustomizeWrapper>
		);
	}

	const productDescription = stripHtmlTags(product.description || "");
	const shouldTruncate = productDescription.split(/\s+/).length > 30;
	const displayedDescription =
		shouldTruncate && !isDescriptionExpanded
			? truncateText(productDescription, 30)
			: productDescription;

	function variantExistsForColorSize(sizeObj) {
		if (!product) return false;
		const colorOption = product.options.find(
			(opt) => opt.name.toLowerCase() === "colors"
		);
		const sizeOption = product.options.find(
			(opt) => opt.name.toLowerCase() === "sizes"
		);
		if (!colorOption || !sizeOption) return false;

		const selectedColorValue = colorOption.values.find(
			(val) => val.title === selectedColor
		);
		if (!selectedColorValue) return false;

		const matchingVariant = product.variants.find(
			(v) =>
				v.options.includes(selectedColorValue.id) &&
				v.options.includes(sizeObj.id)
		);
		return Boolean(matchingVariant);
	}

	function handleColorChange(newColor) {
		setSelectedColor(newColor);
		const sizeOption = product.options.find(
			(opt) => opt.name.toLowerCase() === "sizes"
		);
		if (sizeOption) {
			const colorOption = product.options.find(
				(opt) => opt.name.toLowerCase() === "colors"
			);
			const selectedColorValue = colorOption?.values.find(
				(val) => val.title === newColor
			);
			if (!selectedColorValue) return;

			const validVariants = product.variants.filter((v) =>
				v.options.includes(selectedColorValue.id)
			);
			if (validVariants.length > 0) {
				for (let sizeVal of sizeOption.values) {
					if (validVariants.some((v) => v.options.includes(sizeVal.id))) {
						setSelectedSize(sizeVal.title);
						return;
					}
				}
			}
		}
	}

	return (
		<CustomizeWrapper>
			<Helmet>
				{/* Title: Use dynamic product name + mention customization */}
				<title>
					{product.printifyProductDetails?.title || product.productName} |
					Customize & Print On Demand | Serene Jannat
				</title>

				{/* Description: Use dynamic description or fallback */}
				<meta
					name='description'
					content={
						product.printifyProductDetails?.description ||
						product.description ||
						"Customize this product with your own designs and text. Perfect for gifts!"
					}
				/>

				{/* Keywords: combine the product's tags with some POD phrases */}
				<meta
					name='keywords'
					content={[
						...(product.printifyProductDetails?.tags || []),
						"Print On Demand",
						"Custom Mug",
						"Ceramic",
						"Serene Jannat",
					].join(", ")}
				/>

				{/* OpenGraph for social sharing */}
				<meta
					property='og:title'
					content={`Customize ${product.printifyProductDetails?.title || product.productName} – Serene Jannat`}
				/>
				<meta
					property='og:description'
					content={
						product.printifyProductDetails?.description ||
						product.description ||
						"Create a unique personalized product at Serene Jannat with your own design!"
					}
				/>
				{/* If you have a thumbnail: */}
				{product.thumbnailImage?.[0]?.images?.[0]?.url && (
					<meta
						property='og:image'
						content={product.thumbnailImage[0].images[0].url}
					/>
				)}
				<meta
					property='og:url'
					content={`https://serenejannat.com/custom-gifts/${product._id}`}
				/>
				<meta property='og:type' content='product' />

				{/* Structured Data (JSON-LD) */}
				<script type='application/ld+json'>
					{JSON.stringify({
						"@context": "https://schema.org/",
						"@type": "Product",
						name: product.printifyProductDetails?.title || product.productName,
						image:
							product.thumbnailImage?.[0]?.images?.[0]?.url ||
							"https://serenejannat.com/default-product-image.jpg",
						description:
							product.printifyProductDetails?.description ||
							product.description ||
							"Design your own gift with print-on-demand!",
						sku: product.productSKU || "",
						brand: {
							"@type": "Brand",
							name: "Serene Jannat",
						},
						offers: {
							"@type": "Offer",
							price: (product.priceAfterDiscount || product.price || 0).toFixed(
								2
							),
							priceCurrency: "USD",
							availability:
								(product.quantity || 0) > 0
									? "https://schema.org/InStock"
									: "https://schema.org/OutOfStock",
							url: `https://serenejannat.com/custom-gifts/${product._id}`,
						},
						additionalProperty: [
							{
								"@type": "PropertyValue",
								name: "Print On Demand",
								value: product.printifyProductDetails?.POD ? "Yes" : "No",
							},
							{
								"@type": "PropertyValue",
								name: "Available Sizes",
								value: product.printifyProductDetails?.variants
									?.map((v) => v.title)
									.join(", "),
							},
						],
					})}
				</script>
			</Helmet>

			<Row gutter={[18, 20]}>
				{/* Left: Images Carousel */}
				<Col xs={24} md={12}>
					<StyledSlider {...sliderSettings}>
						{filteredImages.map((image, idx) => {
							if (idx > 0) {
								// Additional slides
								return (
									<SlideImageWrapper key={image.src}>
										<img src={image.src} alt={`${product.title}-${idx}`} />
									</SlideImageWrapper>
								);
							}
							// The main "front" slide
							return (
								<div key={image.src}>
									{/* 
									   (2) => FADE IN EFFECT AFTER 1 SEC FOR MOBILE BUTTONS.
									   We keep the same top area but add a class that fades in.
									*/}
									{isMobile && (
										<MobileToolbarWrapper
											className='noScreenshot'
											style={{
												opacity: showMobileButtons ? 1 : 0,
												transition: "opacity 0.8s ease-in",
											}}
										>
											<MobileLeftCorner>
												<Select
													style={{ width: "100%", marginBottom: 8 }}
													placeholder='Color'
													value={selectedColor}
													onChange={handleColorChange}
													disabled={
														!product.options.find(
															(opt) => opt.name.toLowerCase() === "colors"
														)
													}
												>
													{uniqueColorsForDropdown.map((colorTitle) => (
														<Option key={colorTitle} value={colorTitle}>
															{colorTitle}
														</Option>
													))}
													{!product.options.find(
														(opt) => opt.name.toLowerCase() === "colors"
													) && <Option disabled>No Color</Option>}
												</Select>

												<Select
													style={{ width: "100%" }}
													placeholder='Size'
													value={selectedSize}
													onChange={setSelectedSize}
													disabled={
														!product.options.find(
															(opt) => opt.name.toLowerCase() === "sizes"
														)
													}
												>
													{product.options
														.find((opt) => opt.name.toLowerCase() === "sizes")
														?.values.map((sizeObj) => {
															const isDisabled =
																!variantExistsForColorSize(sizeObj);
															return (
																<Option
																	key={sizeObj.title}
																	value={sizeObj.title}
																	disabled={isDisabled}
																	style={{
																		color: isDisabled ? "#aaa" : "inherit",
																	}}
																>
																	{sizeObj.title}
																</Option>
															);
														})}
													{!product.options.find(
														(opt) => opt.name.toLowerCase() === "sizes"
													) && <Option disabled>No Size</Option>}
												</Select>
											</MobileLeftCorner>

											<FloatingActions>
												<Button
													type='primary'
													icon={<ShoppingCartOutlined />}
													onClick={handleAddToCart}
													disabled={isAddToCartDisabled}
													style={{ width: "50%" }}
												>
													{isAddToCartDisabled
														? "Processing..."
														: "Add to Cart"}
												</Button>
												<Button
													icon={<EditOutlined />}
													onClick={() => {
														setMobileTextInput("");
														setTextModalVisible(true);
														ReactGA.event({
															category: "User Added Text In Custom Design",
															action: "User Added Text In Custom Design",
															label: `User Added Text In Custom Design`,
														});
													}}
												>
													Add Text
												</Button>
												<Button
													icon={<CloudUploadOutlined />}
													onClick={() => {
														ReactGA.event({
															category: "User Uploaded Image In Custom Design",
															action: "User Uploaded Image In Custom Design",
															label: `User Uploaded Image In Custom Design`,
														});
														hiddenFileInputRef.current.click();
													}}
												>
													Upload Image
												</Button>
												<input
													type='file'
													accept='image/*'
													ref={hiddenFileInputRef}
													style={{ display: "none" }}
													onChange={(e) => {
														if (e.target.files?.length) {
															addImageElement(e.target.files[0]);
														}
													}}
												/>
											</FloatingActions>
										</MobileToolbarWrapper>
									)}

									{/* The main overlay (with T-shirt image) */}
									<DesignOverlay ref={designOverlayRef}>
										<OverlayImage
											src={image.src}
											alt={`${product.title}-front`}
											crossOrigin='anonymous'
										/>

										{/* The bounding box for the design area */}
										<PrintArea id='print-area' ref={printAreaRef}>
											{/*  <-- ADDED: Show center line if needed */}
											{showCenterLine && <CenterIndicator />}
											<DottedOverlay className='noScreenshot' />
											{renderDesignElements()}
										</PrintArea>
									</DesignOverlay>
								</div>
							);
						})}
					</StyledSlider>
				</Col>

				{/* Right: Product Info & Custom Panel (Desktop Only) */}
				<Col xs={24} md={12}>
					<ProductTitle level={3}>{product.title}</ProductTitle>
					<ProductDescription>
						{displayedDescription}
						{shouldTruncate && (
							<span>
								{" "}
								<Button
									type='link'
									onClick={() =>
										setIsDescriptionExpanded(!isDescriptionExpanded)
									}
								>
									{isDescriptionExpanded ? "Hide" : "See more"}
								</Button>
							</span>
						)}
					</ProductDescription>

					<div style={{ marginBottom: 16 }}>
						<strong>Price: </strong>
						<span
							style={{
								fontSize: "1.1rem",
								color: "var(--text-color-dark)",
								fontWeight: "bolder",
							}}
						>
							{displayedPrice}
						</span>
					</div>
					<div style={{ marginBottom: 16 }}>
						<strong>Note: </strong>
						<span style={{ fontSize: "1rem", color: "var(--text-color-dark)" }}>
							Please ensure to design on the design area
							<br />
							<br />
							The design area is the dotted area w/n the product, so if your
							design is a little bit bigger than the actual area, it is going to
							be ok, but we will usually add your design in the designated area
							which is the dotted area.
						</span>
					</div>

					<CustomizePanel className='whole-select-options'>
						<Title
							level={4}
							style={{ color: "var(--text-color-dark)", marginBottom: 8 }}
						>
							Select Options:
						</Title>
						<Row gutter={12}>
							<Col span={12}>
								<Select
									style={{ width: "100%" }}
									className='selectDesktopOrMobile'
									placeholder='Color'
									value={selectedColor}
									onChange={handleColorChange}
									disabled={
										!product.options.find(
											(opt) => opt.name.toLowerCase() === "colors"
										)
									}
								>
									{uniqueColorsForDropdown.map((colorTitle) => (
										<Option key={colorTitle} value={colorTitle}>
											{colorTitle}
										</Option>
									))}
									{!product.options.find(
										(opt) => opt.name.toLowerCase() === "colors"
									) && <Option disabled>No Color</Option>}
								</Select>
							</Col>
							<Col span={12}>
								<Select
									style={{ width: "100%" }}
									className='selectDesktopOrMobile'
									placeholder='Size'
									value={selectedSize}
									onChange={setSelectedSize}
									disabled={
										!product.options.find(
											(opt) => opt.name.toLowerCase() === "sizes"
										)
									}
								>
									{product.options
										.find((opt) => opt.name.toLowerCase() === "sizes")
										?.values.map((sizeObj) => {
											const isDisabled = !variantExistsForColorSize(sizeObj);
											return (
												<Option
													key={sizeObj.title}
													value={sizeObj.title}
													disabled={isDisabled}
													style={{ color: isDisabled ? "#aaa" : "inherit" }}
												>
													{sizeObj.title}
												</Option>
											);
										})}
									{!product.options.find(
										(opt) => opt.name.toLowerCase() === "sizes"
									) && <Option disabled>No Size Options</Option>}
								</Select>
							</Col>
						</Row>
						<Divider style={{ margin: "16px 0" }} />
						<Title level={4} style={{ color: "var(--text-color-dark)" }}>
							Add/Update Text
						</Title>

						{!isMobile && (
							<>
								<Row gutter={8}>
									<Col span={24}>
										<Input.TextArea
											placeholder='Enter text here'
											value={userText}
											onChange={(e) => setUserText(e.target.value)}
											autoSize={{ minRows: 2, maxRows: 6 }}
										/>
									</Col>
								</Row>
								<div style={{ marginTop: 12 }}>
									<Button
										type='primary'
										block
										onClick={() => addTextElement()}
										style={{ fontWeight: "bold" }}
									>
										Add Text
									</Button>
								</div>
							</>
						)}

						<Divider />
						<Title level={4}>Upload Your Image</Title>
						{!isMobile && (
							<UploadZone {...getRootProps()}>
								<input {...getInputProps()} />
								<p>Drag &amp; drop or click to select an image</p>
							</UploadZone>
						)}
					</CustomizePanel>

					{!isMobile && (
						<div
							style={{ width: "50%", fontSize: "1.1rem", fontWeight: "bold" }}
						>
							<button
								type='primary'
								onClick={handleAddToCart}
								disabled={isAddToCartDisabled}
								className='btn btn-success'
								style={{
									width: "50%",
									fontSize: "1.2rem",
									fontWeight: "bold",
								}}
							>
								{isAddToCartDisabled ? "Processing..." : "Add to Cart"}
							</button>
						</div>
					)}
				</Col>
			</Row>

			{/* (3) => ENSURE THE SAME OPTIONS SHOW AT THE BOTTOM ON MOBILE */}
			{isMobile && (
				<MobileBottomPanel>
					<Divider />
					<CustomizePanel>
						<Title
							level={4}
							style={{ color: "var(--text-color-dark)", marginBottom: 8 }}
						>
							Select Options:
						</Title>
						<Row gutter={12}>
							<Col span={12}>
								<Select
									style={{ width: "100%" }}
									placeholder='Color'
									value={selectedColor}
									onChange={handleColorChange}
									disabled={
										!product.options.find(
											(opt) => opt.name.toLowerCase() === "colors"
										)
									}
								>
									{uniqueColorsForDropdown.map((colorTitle) => (
										<Option key={colorTitle} value={colorTitle}>
											{colorTitle}
										</Option>
									))}
									{!product.options.find(
										(opt) => opt.name.toLowerCase() === "colors"
									) && <Option disabled>No Color</Option>}
								</Select>
							</Col>
							<Col span={12}>
								<Select
									style={{ width: "100%" }}
									placeholder='Size'
									value={selectedSize}
									onChange={setSelectedSize}
									disabled={
										!product.options.find(
											(opt) => opt.name.toLowerCase() === "sizes"
										)
									}
								>
									{product.options
										.find((opt) => opt.name.toLowerCase() === "sizes")
										?.values.map((sizeObj) => {
											const isDisabled = !variantExistsForColorSize(sizeObj);
											return (
												<Option
													key={sizeObj.title}
													value={sizeObj.title}
													disabled={isDisabled}
													style={{ color: isDisabled ? "#aaa" : "inherit" }}
												>
													{sizeObj.title}
												</Option>
											);
										})}
									{!product.options.find(
										(opt) => opt.name.toLowerCase() === "sizes"
									) && <Option disabled>No Size Options</Option>}
								</Select>
							</Col>
						</Row>
						<Divider style={{ margin: "16px 0" }} />

						<Title level={4} style={{ color: "var(--text-color-dark)" }}>
							Add/Update Text
						</Title>
						{/* (On mobile, we also have the top toolbar + a modal, 
							but let's replicate the user experience in the bottom as well) */}
						<Row gutter={8}>
							<Col span={24}>
								<Input.TextArea
									placeholder='Enter text here'
									value={userText}
									onChange={(e) => setUserText(e.target.value)}
									autoSize={{ minRows: 2, maxRows: 6 }}
								/>
							</Col>
						</Row>
						<div style={{ marginTop: 12 }}>
							<Button
								type='primary'
								block
								onClick={() => addTextElement()}
								style={{ fontWeight: "bold" }}
							>
								Add Text
							</Button>
						</div>

						<Divider />
						<Title level={4}>Upload Your Image</Title>
						<UploadZone {...getRootProps()}>
							<input {...getInputProps()} />
							<p>Drag &amp; drop or click to select an image</p>
						</UploadZone>

						<Divider />

						<Button
							type='primary'
							icon={<ShoppingCartOutlined />}
							onClick={handleAddToCart}
							disabled={isAddToCartDisabled}
							style={{ width: "100%", marginTop: "1rem" }}
						>
							{isAddToCartDisabled ? "Processing..." : "Add to Cart"}
						</Button>
					</CustomizePanel>
				</MobileBottomPanel>
			)}

			{/* Mobile "Add Text" Modal */}
			<Modal
				title='Add Your Text'
				open={textModalVisible}
				onCancel={() => setTextModalVisible(false)}
				onOk={() => {
					addTextElement(mobileTextInput);
					setTextModalVisible(false);
				}}
			>
				<Input
					placeholder='Type your text here...'
					value={mobileTextInput}
					onChange={(e) => setMobileTextInput(e.target.value)}
				/>
			</Modal>

			{/* Hidden container for bare design screenshot */}
			<BareDesignOverlay ref={bareDesignRef}>
				{/* 
          The same bounding area (no border needed) so positions
          & rotations match for the "bare" screenshot.
        */}
				<BarePrintArea id='bare-print-area' ref={barePrintAreaRef}>
					{elements.map((el) => (
						<Rnd
							key={el.id}
							bounds='#bare-print-area'
							position={{ x: el.x, y: el.y }}
							size={{ width: el.width, height: el.height }}
							onDragStop={(e, data) => handleRndDragStop(e, data, el.id)}
							onResizeStop={(e, dir, ref, delta, pos) =>
								handleRndResizeStop(e, dir, ref, delta, pos, el.id)
							}
							cancel='.text-toolbar, .image-toolbar, .text-toolbar *, .image-toolbar *'
							style={{
								position: "absolute",
							}}
						>
							<div
								style={{
									width: "100%",
									height: "100%",
									transform: `rotate(${el.rotation || 0}deg)`,
									transformOrigin: "center center",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								{el.type === "text" ? (
									<div
										style={{
											whiteSpace: "pre-wrap",
											color: el.color,
											backgroundColor: el.backgroundColor,
											fontSize: el.fontSize,
											fontFamily: el.fontFamily,
											fontWeight: el.fontWeight,
											fontStyle: el.fontStyle,
											borderRadius: el.borderRadius,
											width: "100%",
											height: "100%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											textAlign: "center",
										}}
									>
										{el.text}
									</div>
								) : (
									<img
										src={el.src}
										alt='Custom'
										style={{
											width: "100%",
											height: "100%",
											objectFit: "contain",
											borderRadius: el.borderRadius || 0,
										}}
									/>
								)}
							</div>
						</Rnd>
					))}
				</BarePrintArea>
			</BareDesignOverlay>

			<PrintifyCheckoutModal
				open={isCheckoutModalVisible}
				onClose={() => setIsCheckoutModalVisible(false)}
				order={order}
				setOrder={setOrder}
				product={product}
			/>
		</CustomizeWrapper>
	);

	/**
	 * Renders the user’s design elements inside the main #print-area
	 */
	function renderDesignElements() {
		return elements.map((el) => {
			const isSelected = el.id === selectedElementId;

			return (
				<Rnd
					key={el.id}
					className='rnd-element'
					bounds='#print-area'
					position={{ x: el.x, y: el.y }}
					size={{ width: el.width, height: el.height }}
					enableResizing={{
						topLeft: true,
						topRight: true,
						bottomLeft: true,
						bottomRight: true,
					}}
					handleStyles={{
						topLeft: { width: "20px", height: "20px" },
						topRight: { width: "20px", height: "20px" },
						bottomLeft: { width: "20px", height: "20px" },
						bottomRight: { width: "20px", height: "20px" },
					}}
					onDrag={(e, data) => handleRndDrag(e, data, el.id)} // <-- ADDED
					onDragStop={(e, data) => handleRndDragStop(e, data, el.id)}
					onResizeStart={() => setSelectedElementId(el.id)}
					onResizeStop={(e, dir, ref, delta, pos) =>
						handleRndResizeStop(e, dir, ref, delta, pos, el.id)
					}
					dragHandleClassName={DRAGGABLE_REGION_CLASS}
					cancel='.rotate-handle, .text-toolbar, .image-toolbar, .text-toolbar *, .image-toolbar *'
					style={{
						border: isSelected
							? "1px dashed var(--text-color-dark)"
							: "1px dashed transparent",
						position: "absolute",
					}}
					onMouseDown={() => handleElementClick(el)}
					onTouchStart={() => handleElementClick(el)}
				>
					<div
						className={DRAGGABLE_REGION_CLASS}
						style={{
							width: "100%",
							height: "100%",
							cursor: "move",
							transform: `rotate(${el.rotation || 0}deg)`,
							transformOrigin: "center center",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{el.type === "text" ? (
							inlineEditId === el.id ? (
								<InlineEditContainer>
									<Input.TextArea
										value={inlineEditText}
										onChange={(e) => setInlineEditText(e.target.value)}
										autoFocus
										onBlur={() => handleInlineEditSave(el.id)}
										autoSize={{ minRows: 2, maxRows: 6 }}
									/>
									<InlineEditButtons>
										<Button
											type='primary'
											size='small'
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => handleInlineEditSave(el.id)}
											style={{ marginRight: 8 }}
										>
											Save
										</Button>
										<Button
											size='small'
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => setInlineEditId(null)}
										>
											Cancel
										</Button>
									</InlineEditButtons>
								</InlineEditContainer>
							) : (
								<TextElement
									onDoubleClick={() => handleTextDoubleClick(el)}
									onTouchEnd={() => handleTextTouchEnd(el)}
									style={{
										whiteSpace: "pre-wrap",
										color: el.color,
										backgroundColor: el.backgroundColor,
										fontSize: el.fontSize,
										fontFamily: el.fontFamily,
										fontWeight: el.fontWeight,
										fontStyle: el.fontStyle,
										borderRadius: el.borderRadius,
										width: "100%",
										height: "100%",
										padding: "4px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										textAlign: "center",
										userSelect: "none",
									}}
								>
									{el.text}
								</TextElement>
							)
						) : (
							<ImageElement
								src={el.src}
								alt='Custom'
								style={{
									width: "100%",
									height: "100%",
									objectFit: "contain",
									borderRadius: el.borderRadius || 0,
									userSelect: "none",
								}}
							/>
						)}
					</div>

					{/* Rotation handle */}
					{isSelected && (
						<RotateHandle
							className='rotate-handle'
							onMouseDown={(evt) => onRotationStart(evt, el.id)}
							onTouchStart={(evt) => onRotationStart(evt, el.id)}
							title='Rotate this element'
							style={{ touchAction: "none" }}
						>
							↻
						</RotateHandle>
					)}

					{/* 5s tooltip if text is selected */}
					{isSelected && el.type === "text" && showTooltipForText === el.id && (
						<DoubleClickTooltip>
							{isMobile
								? "Double-tap to edit text"
								: "Double-click to edit text"}
						</DoubleClickTooltip>
					)}

					{/* TEXT toolbar if text is selected & not rotating */}
					{isSelected && el.type === "text" && !isRotating && (
						<TextToolbarContainer className='text-toolbar'>
							<TextToolbar>
								<ToolbarRowOne>
									<Button
										size='small'
										icon={<DownOutlined />}
										onClick={() => {
											const newSize = Math.max(el.fontSize - 1, 8);
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, fontSize: newSize }
														: item
												)
											);
										}}
									/>
									<span
										style={{
											fontWeight: "bold",
											background: "black",
											padding: "2px",
											borderRadius: "10px",
											color: "lightgrey",
										}}
									>
										{el.fontSize}
									</span>
									<Button
										size='small'
										icon={<UpOutlined />}
										onClick={() => {
											const newSize = Math.min(el.fontSize + 1, 72);
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, fontSize: newSize }
														: item
												)
											);
										}}
									/>
									<Popover
										content={
											<>
												<span
													style={{ fontSize: "0.75rem", fontWeight: "bold" }}
												>
													Click to choose color
												</span>
												<Input
													type='color'
													defaultValue={el.color || "#000000"}
													onChange={(ev) => {
														const newColor = ev.target.value;
														setElements((prev) =>
															prev.map((item) =>
																item.id === el.id
																	? { ...item, color: newColor }
																	: item
															)
														);
														setTextColor(newColor);
													}}
												/>
											</>
										}
										trigger='click'
										placement='top'
									>
										<FontColorsOutlined
											style={{ cursor: "pointer", color: el.color }}
											title='Change Font Color'
										/>
									</Popover>
									<Popover
										content={
											<>
												<span
													style={{ fontSize: "0.75rem", fontWeight: "bold" }}
												>
													Click to choose color
												</span>
												<Input
													type='color'
													defaultValue={el.backgroundColor || "transparent"}
													onChange={(ev) => {
														const newBg = ev.target.value;
														setElements((prev) =>
															prev.map((item) =>
																item.id === el.id
																	? { ...item, backgroundColor: newBg }
																	: item
															)
														);
													}}
												/>
											</>
										}
										trigger='click'
										placement='top'
									>
										<BgColorsOutlined
											style={{ cursor: "pointer" }}
											title='Background Color'
										/>
									</Popover>
									<FontFamilySelect
										value={el.fontFamily}
										onChange={(value) => {
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, fontFamily: value }
														: item
												)
											);
										}}
										placeholder='Font'
										allowClear
									>
										<Option value='Arial' style={{ fontFamily: "Arial" }}>
											Arial
										</Option>
										<Option
											value='Times New Roman'
											style={{ fontFamily: "Times New Roman" }}
										>
											Times New Roman
										</Option>
										<Option value='Courier' style={{ fontFamily: "Courier" }}>
											Courier
										</Option>
										<Option value='Georgia' style={{ fontFamily: "Georgia" }}>
											Georgia
										</Option>
										<Option value='Verdana' style={{ fontFamily: "Verdana" }}>
											Verdana
										</Option>
										<Option value='Allura' style={{ fontFamily: "Allura" }}>
											Allura
										</Option>
										<Option
											value='Dancing Script'
											style={{ fontFamily: "Dancing Script" }}
										>
											Dancing Script
										</Option>
										<Option
											value='Great Vibes'
											style={{ fontFamily: "Great Vibes" }}
										>
											Great Vibes
										</Option>
										<Option value='Lobster' style={{ fontFamily: "Lobster" }}>
											Lobster
										</Option>
									</FontFamilySelect>
								</ToolbarRowOne>

								<ToolbarRowTwo>
									<BoldOutlined
										onClick={() => {
											const newWeight =
												el.fontWeight === "bold" ? "normal" : "bold";
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, fontWeight: newWeight }
														: item
												)
											);
											setFontWeight(newWeight);
										}}
									/>
									<ItalicOutlined
										onClick={() =>
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? {
																...item,
																fontStyle:
																	item.fontStyle === "italic"
																		? "normal"
																		: "italic",
															}
														: item
												)
											)
										}
										style={{
											fontStyle:
												el.fontStyle === "italic" ? "italic" : "normal",
											fontWeight: "bold",
										}}
										title='Toggle Italic'
									/>
									<InputNumber
										min={0}
										max={50}
										value={el.borderRadius}
										onChange={(value) =>
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, borderRadius: value }
														: item
												)
											)
										}
										size='small'
										style={{ width: 60 }}
										placeholder='Radius'
										title='Border Radius'
									/>
									<NoBgSpan
										onClick={() => {
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, backgroundColor: "transparent" }
														: item
												)
											);
										}}
									>
										NoBackground
									</NoBgSpan>
									<DeleteIcon
										onClick={() => deleteSelectedElement(el.id)}
										title='Delete'
									>
										<DeleteOutlined />
									</DeleteIcon>
								</ToolbarRowTwo>

								<ToolbarRowReset>
									<ResetIcon
										onClick={() => handleResetStyling(el.id)}
										title='Reset styling'
									>
										<ReloadOutlined />
									</ResetIcon>
								</ToolbarRowReset>
							</TextToolbar>
						</TextToolbarContainer>
					)}

					{/* IMAGE toolbar if image is selected & not rotating */}
					{isSelected && el.type === "image" && !isRotating && (
						<ImageToolbarContainer className='image-toolbar'>
							<ImageToolbar>
								<ToolbarRowImage>
									<InputNumber
										min={0}
										max={200}
										value={el.borderRadius || 0}
										onChange={(value) => {
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, borderRadius: value }
														: item
												)
											);
											setBorderRadius(value);
										}}
										size='small'
										style={{ width: 80 }}
										placeholder='Radius'
										title='Border Radius'
									/>

									<RemoveBgButton onClick={() => handleRemoveBgToggle(el.id)}>
										{el.bgRemoved ? "Default" : "Remove BG"}
									</RemoveBgButton>

									<DeleteIcon
										onClick={() => deleteSelectedElement(el.id)}
										title='Delete Image'
									>
										<DeleteOutlined />
									</DeleteIcon>
								</ToolbarRowImage>

								<ToolbarRowReset>
									<ResetIcon
										onClick={() => handleResetStyling(el.id)}
										title='Reset styling'
									>
										<ReloadOutlined />
									</ResetIcon>
								</ToolbarRowReset>
							</ImageToolbar>
						</ImageToolbarContainer>
					)}
				</Rnd>
			);
		});
	}
}

/* ========== Styled Components ========== */

const CustomizeWrapper = styled.section`
	padding: 40px;
	min-height: 85vh;
	background-color: var(--background-light);

	@media (max-width: 800px) {
		padding: 10px !important;
		margin: 0 !important;
	}
`;

const StyledSlider = styled(Slider)`
	.slick-slide {
		text-align: center;
		outline: none;
	}
	.slick-dots {
		bottom: -30px;
	}
`;

const DesignOverlay = styled.div`
	position: relative;
	margin: 0 auto;
	width: 90%;
	max-width: 800px;
	height: 700px;
	background-color: #ffffff;
	overflow: hidden;

	@media (max-width: 800px) {
		width: 100%;
		max-width: 100%;
		height: auto;
		overflow: visible;
		aspect-ratio: 800 / 700;
	}
`;

/** The bounding box for the design area.
 *  We'll overlay "DottedOverlay" with className="noScreenshot"
 *  so the dashed lines never appear in the final PNG.
 */
const PrintArea = styled.div`
	position: absolute;
	top: 20%;
	left: 20%;
	width: 60%;
	height: 75%;
	pointer-events: auto;
	z-index: 1;
`;

/** A separate overlay with dashed lines and pointer-events: none
 *  plus "noScreenshot" => ignored by html2canvas
 */
const DottedOverlay = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border: 2px dashed rgba(0, 0, 0, 0.2);
	pointer-events: none;
	z-index: 2;
`;

const OverlayImage = styled.img`
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
	position: absolute;
	top: 0;
	left: 0;
	z-index: 0;
	crossorigin: anonymous;
`;

const SlideImageWrapper = styled.div`
	display: flex !important;
	align-items: center;
	justify-content: center;
	min-height: 610px;
	background-color: #ffffff;
	cursor: pointer;

	img {
		width: 80%;
		height: auto;
		max-width: 500px;
	}

	@media (max-width: 800px) {
		min-height: auto !important;
		padding-bottom: 0 !important;
	}
`;

const MobileToolbarWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	padding: 8px;
	background: #fff;
`;

const MobileLeftCorner = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
`;

const FloatingActions = styled.div`
	display: flex;
	gap: 8px;
	flex-wrap: wrap;

	button {
		display: flex;
		align-items: center;
		gap: 6px;
	}
`;

/* 
   (3) We add a bottom panel on mobile so the same options 
   appear at the bottom, fulfilling the request for #3
*/
const MobileBottomPanel = styled.div`
	margin-top: 2rem;
`;

const TextElement = styled.div``;
const ImageElement = styled.img``;

const TextToolbarContainer = styled.div`
	position: absolute;
	top: -150px;
	left: 0;
	z-index: 9999;

	@media (max-width: 700px) {
		top: -160px;
	}
`;

const TextToolbar = styled.div`
	display: flex;
	flex-direction: column;
	background: rgba(255, 255, 255, 0.9);
	border: 1px solid var(--border-color-light);
	border-radius: 4px;
	padding: 4px 8px;
	gap: 6px;
`;

const ToolbarRowOne = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;
`;

const ToolbarRowTwo = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;
`;

const ToolbarRowReset = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 8px;
`;

const ResetIcon = styled.div`
	background: #f0f0f0;
	color: #666;
	border-radius: 4px;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border: 1px solid #ccc;
`;

const DeleteIcon = styled.div`
	background: #ff4d4f;
	color: #fff;
	border-radius: 50%;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
`;

const NoBgSpan = styled.span`
	font-size: 0.75rem;
	cursor: pointer;
	padding: 4px 6px;
	text-decoration: underline;
	font-weight: bold;
`;

const FontFamilySelect = styled(Select)`
	width: 130px;
	margin-left: 0 !important;

	.ant-select-selector {
		display: flex;
		align-items: center;
		height: 32px !important;
	}
`;

const CustomizePanel = styled.div`
	background: #fff;
	padding: 16px;
	margin-bottom: 16px;
	border-radius: 8px;
	box-shadow: var(--box-shadow-light);
`;

const UploadZone = styled.div`
	width: 100%;
	padding: 16px;
	border: 2px dashed var(--border-color-dark, #707070);
	border-radius: 8px;
	text-align: center;
	cursor: pointer;
	background-color: var(--neutral-light, #f7f4ef);

	&:hover {
		background-color: var(--neutral-light2, #e2e6f0);
	}
`;

const ProductTitle = styled(Title)`
	&& {
		margin-bottom: 8px;
		font-weight: 600;
		color: var(--text-color-dark);
	}
`;

const ProductDescription = styled.p`
	margin-bottom: 16px;
	color: var(--text-color-secondary);
	line-height: 1.4;
`;

const InlineEditContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const InlineEditButtons = styled.div`
	display: flex;
	gap: 8px;
`;

/** Hidden container for the bare/transparent screenshot. */
const BareDesignOverlay = styled.div`
	position: absolute;
	top: -9999px;
	left: -9999px;
	width: 90%;
	max-width: 800px;
	height: 700px;
	background: transparent;
	overflow: visible;
`;

const BarePrintArea = styled.div`
	position: absolute;
	top: 20%;
	left: 25%;
	width: 50%;
	height: 40%;
	pointer-events: auto;
`;

const RotateHandle = styled.div`
	position: absolute;
	top: 50%;
	right: -25px;
	transform: translateY(-50%);
	cursor: grab;
	font-size: 16px;
	background: #fff;
	border: 1px solid #999;
	border-radius: 50%;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
	user-select: none;

	&:active {
		cursor: grabbing;
	}
`;

const ImageToolbarContainer = styled.div`
	position: absolute;
	top: -90px;
	left: 0;
	z-index: 9999;

	@media (max-width: 700px) {
		top: -100px;
	}
`;

const ImageToolbar = styled.div`
	display: flex;
	flex-direction: column;
	background: rgba(255, 255, 255, 0.9);
	border: 1px solid var(--border-color-light);
	border-radius: 4px;
	padding: 4px 8px;
	gap: 6px;
`;

const ToolbarRowImage = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`;

const RemoveBgButton = styled(Button)`
	background: #ffc069;
	border-color: #ffc069;
	color: #000;

	&:hover {
		background: #ffd591;
		border-color: #ffd591;
	}
`;

const DoubleClickTooltip = styled.div`
	position: absolute;
	top: calc(100%);
	left: 50%;
	transform: translateX(-50%) translateY(10px);
	background: #222;
	color: #fff;
	padding: 6px 10px;
	border-radius: 4px;
	font-size: 0.75rem;
	pointer-events: none;
	white-space: nowrap;
	z-index: 999999;
	opacity: 0;
	animation: tooltipFadeInOut 5s forwards;

	@keyframes tooltipFadeInOut {
		0% {
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
`;

const mediaCSS = `
  @media (max-width: 800px) {
    .slick-dots {
      bottom: 0 !important;
      margin-bottom: 0 !important;
    }
    .slick-slider {
      margin-bottom: 0 !important;
    }
  }
`;
const styleTag = document.createElement("style");
styleTag.innerHTML = mediaCSS;
document.head.appendChild(styleTag);

// -------------------------------------
// The NEW vertical center indicator (ADDED)
// -------------------------------------
const CenterIndicator = styled.div`
	position: absolute;
	top: 0;
	bottom: 0;
	width: 2px;
	/* background: rgba(255, 0, 0, 0.3); */
	left: 50%;
	pointer-events: none;
	z-index: 9999;
	border: 1px dotted rgba(255, 0, 0, 0.3);
`;


