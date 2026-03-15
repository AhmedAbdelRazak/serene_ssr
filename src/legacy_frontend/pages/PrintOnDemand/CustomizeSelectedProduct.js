import React, { useEffect, useState, useRef, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { useParams, useHistory, useLocation } from "react-router-dom";
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
	Spin,
	Switch,
	Progress,
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
	CameraOutlined,
	EyeOutlined,
} from "@ant-design/icons";
import PrintifyCheckoutModal from "./PrintifyCheckoutModal";
import { isAuthenticated } from "../../auth";
import { cloudinaryUpload1, cleanupPreviewCustomDesign } from "../../apiCore";

import html2canvas from "html2canvas";
import { useCartContext } from "../../cart_context";
import { Rnd } from "react-rnd";
import { Helmet } from "react-helmet-async";

// GA 4
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";

// heic2any for .heic â†’ jpeg
import heic2any from "heic2any";

// Fallback library for final image conversion
import domtoimage from "dom-to-image-more";
import {
	findPodProductOption,
	normalizePodProduct,
	resolveInitialPodVariantSelection,
} from "@/lib/pod-product";
import { useLegacyRouteBootstrap } from "../../bootstrap/LegacyRouteBootstrapContext";

// Child tutorial/animation (temporarily disabled on the single POD page)
// import AnimationPODWalkThrough from "../MyAnimationComponents/AnimationPODWalkThrough";
import {
	POD_OCCASION_OPTIONS,
	resolvePodPersonalization,
	savePodPersonalization,
	buildGiftMessage,
	getOccasionOption,
} from "./podPersonalization";
import { getOccasionDesignPreset } from "./podDesignPresets";

const { Title } = Typography;
const { Option } = Select;
const POD_ADVANCED_MODE_KEY = "podAdvancedModeEnabledV1";

function clampNumber(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function getPodProductKindForDefaultDesign(product = {}) {
	const normalizedName = `${product?.title || product?.productName || ""}`.toLowerCase();
	if (
		normalizedName.includes("t-shirt") ||
		normalizedName.includes("tee") ||
		(normalizedName.includes("shirt") &&
			!normalizedName.includes("sweatshirt"))
	) {
		return "apparel";
	}
	if (
		normalizedName.includes("hoodie") ||
		normalizedName.includes("sweatshirt") ||
		normalizedName.includes("pullover")
	) {
		return "hoodie";
	}
	if (normalizedName.includes("tote")) return "tote";
	if (normalizedName.includes("weekender") || normalizedName.includes("bag")) {
		return "bag";
	}
	if (normalizedName.includes("mug")) return "mug";
	if (normalizedName.includes("pillow")) return "pillow";
	if (normalizedName.includes("magnet")) return "magnet";
	return "default";
}

function getPodPrintAreaFrame(product = {}) {
	const kind = getPodProductKindForDefaultDesign(product);
	switch (kind) {
		case "apparel":
			return { top: "19%", left: "21%", width: "58%", height: "72%" };
		case "hoodie":
			return { top: "20%", left: "21%", width: "58%", height: "71%" };
		case "tote":
			return { top: "20%", left: "24%", width: "52%", height: "64%" };
		case "bag":
			return { top: "18%", left: "22%", width: "56%", height: "62%" };
		case "mug":
			return { top: "30%", left: "18%", width: "64%", height: "42%" };
		case "pillow":
		case "magnet":
			return { top: "16%", left: "16%", width: "68%", height: "68%" };
		default:
			return { top: "20%", left: "20%", width: "60%", height: "75%" };
	}
}

function getPodPrintifySafeInsetPercent(product = {}) {
	const kind = getPodProductKindForDefaultDesign(product);
	switch (kind) {
		case "apparel":
		case "hoodie":
			return 8;
		case "tote":
		case "bag":
			return 8;
		case "mug":
			return 12;
		case "pillow":
		case "magnet":
			return 7;
		default:
			return 8;
	}
}

function resolvePrintifySafeBounds(containerWidth, containerHeight, insetPercent = 0) {
	const width = Math.max(0, Number(containerWidth) || 0);
	const height = Math.max(0, Number(containerHeight) || 0);
	const safeInsetPercent = clampNumber(Number(insetPercent) || 0, 0, 45);
	const insetX = (width * safeInsetPercent) / 100;
	const insetY = (height * safeInsetPercent) / 100;
	return {
		minX: insetX,
		minY: insetY,
		maxX: Math.max(insetX, width - insetX),
		maxY: Math.max(insetY, height - insetY),
	};
}

function clampElementPositionWithinBounds(x, y, width, height, bounds) {
	const safeWidth = Math.max(24, Number(width) || 0);
	const safeHeight = Math.max(24, Number(height) || 0);
	const minX = Number(bounds?.minX) || 0;
	const minY = Number(bounds?.minY) || 0;
	const maxX = Math.max(minX, (Number(bounds?.maxX) || 0) - safeWidth);
	const maxY = Math.max(minY, (Number(bounds?.maxY) || 0) - safeHeight);
	return {
		x: clampNumber(Number(x) || 0, minX, maxX),
		y: clampNumber(Number(y) || 0, minY, maxY),
	};
}

function clampElementRectWithinBounds(rect = {}, bounds) {
	const minX = Number(bounds?.minX) || 0;
	const minY = Number(bounds?.minY) || 0;
	const maxX = Number(bounds?.maxX) || minX;
	const maxY = Number(bounds?.maxY) || minY;
	const limitWidth = Math.max(24, maxX - minX);
	const limitHeight = Math.max(24, maxY - minY);
	const width = clampNumber(Math.max(24, Number(rect.width) || 24), 24, limitWidth);
	const height = clampNumber(Math.max(24, Number(rect.height) || 24), 24, limitHeight);
	const point = clampElementPositionWithinBounds(
		rect.x,
		rect.y,
		width,
		height,
		bounds
	);
	return {
		x: point.x,
		y: point.y,
		width,
		height,
	};
}

function resolveAutoDesignGeometry(product = {}, preset = {}) {
	const kind = getPodProductKindForDefaultDesign(product);
	const normalizedName = `${product?.title || product?.productName || ""}`.toLowerCase();
	const isCottonCanvasTote =
		kind === "tote" &&
		(normalizedName.includes("cotton canvas tote bag") ||
			normalizedName.includes("cotton canvas tote"));
	const defaultsByKind = {
		apparel: {
			messageWidthRatio: 0.5,
			messageHeightRatio: 0.2,
			messageCenterYRatio: 0.4,
			iconSizeRatio: 0.078,
			iconOverlapPx: 8,
			maxMessageHeight: 92,
			maxIconSize: 48,
		},
		hoodie: {
			messageWidthRatio: 0.5,
			messageHeightRatio: 0.198,
			messageCenterYRatio: 0.395,
			iconSizeRatio: 0.078,
			iconOverlapPx: 8,
			maxMessageHeight: 92,
			maxIconSize: 48,
		},
		tote: {
			messageWidthRatio: 0.66,
			messageHeightRatio: 0.24,
			messageCenterYRatio: 0.48,
			iconSizeRatio: 0.086,
			iconOverlapPx: 6,
			maxMessageHeight: 104,
			maxIconSize: 50,
		},
		bag: {
			messageWidthRatio: 0.64,
			messageHeightRatio: 0.23,
			messageCenterYRatio: 0.47,
			iconSizeRatio: 0.084,
			iconOverlapPx: 6,
			maxMessageHeight: 102,
			maxIconSize: 48,
		},
		mug: {
			messageWidthRatio: 0.6,
			messageHeightRatio: 0.245,
			messageCenterYRatio: 0.54,
			iconSizeRatio: 0.08,
			iconOverlapPx: 6,
			maxMessageHeight: 100,
			maxIconSize: 50,
		},
		pillow: {
			messageWidthRatio: 0.62,
			messageHeightRatio: 0.24,
			messageCenterYRatio: 0.54,
			iconSizeRatio: 0.078,
			iconOverlapPx: 6,
			maxMessageHeight: 104,
			maxIconSize: 52,
		},
		magnet: {
			messageWidthRatio: 0.62,
			messageHeightRatio: 0.24,
			messageCenterYRatio: 0.53,
			iconSizeRatio: 0.078,
			iconOverlapPx: 6,
			maxMessageHeight: 102,
			maxIconSize: 52,
		},
		default: {
			messageWidthRatio: 0.52,
			messageHeightRatio: 0.2,
			messageCenterYRatio: 0.43,
			iconSizeRatio: 0.076,
			iconOverlapPx: 6,
			maxMessageHeight: 92,
			maxIconSize: 48,
		},
	};
	const visualTuneByKind = {
		apparel: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: 0,
		},
		hoodie: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: 0,
		},
		tote: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: 0,
		},
		bag: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: 0,
		},
		default: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: 0,
		},
	};
	const productSpecificCenterYOffset = isCottonCanvasTote ? 0.17 : 0;
	const base = defaultsByKind[kind] || defaultsByKind.default;
	const visualTune = visualTuneByKind[kind] || visualTuneByKind.default;
	const numberOrFallback = (value, fallback) => {
		const num = Number(value);
		return Number.isFinite(num) ? num : fallback;
	};
	const rawMessageWidthRatio = numberOrFallback(
		preset.messageWidthRatio,
		base.messageWidthRatio,
	);
	const rawMessageHeightRatio = numberOrFallback(
		preset.messageHeightRatio,
		base.messageHeightRatio,
	);
	const rawMessageCenterYRatio = numberOrFallback(
		preset.messageCenterYRatio,
		base.messageCenterYRatio,
	);
	const rawIconSizeRatio = numberOrFallback(
		preset.iconSizeRatio,
		base.iconSizeRatio,
	);
	return {
		kind,
		messageWidthRatio: clampNumber(
			rawMessageWidthRatio * Number(visualTune.messageWidthFactor || 1),
			0.34,
			0.72,
		),
		messageHeightRatio: clampNumber(
			rawMessageHeightRatio * Number(visualTune.messageHeightFactor || 1),
			0.1,
			0.3,
		),
		messageCenterYRatio: clampNumber(
			rawMessageCenterYRatio +
				Number(visualTune.centerYOffset || 0) +
				productSpecificCenterYOffset,
			0.2,
			0.72,
		),
		iconSizeRatio: clampNumber(
			rawIconSizeRatio * Number(visualTune.iconSizeFactor || 1),
			0.05,
			0.16,
		),
		iconOverlapPx: numberOrFallback(preset.iconOverlapPx, base.iconOverlapPx),
		maxMessageHeight: clampNumber(
			numberOrFallback(preset.maxMessageHeight, base.maxMessageHeight || 74),
			74,
			140,
		),
		maxIconSize: clampNumber(
			numberOrFallback(preset.maxIconSize, base.maxIconSize || 44),
			44,
			84,
		),
	};
}

function buildTextElementStyle(el = {}) {
	const safeBackgroundColor = el.backgroundColor || "transparent";
	const hasGradient = typeof el.backgroundImage === "string" && el.backgroundImage.trim();
	const borderWidth = clampNumber(Number(el.borderWidth) || 0, 0, 12);
	const safePaddingX = clampNumber(Number(el.paddingX) || 4, 0, 60);
	const safePaddingY = clampNumber(Number(el.paddingY) || 4, 0, 40);
	const safeBorderRadius = clampNumber(Number(el.borderRadius) || 0, 0, 999);
	return {
		whiteSpace: "pre-wrap",
		color: el.color,
		backgroundColor: safeBackgroundColor,
		backgroundImage: hasGradient ? el.backgroundImage : "none",
		fontSize: el.fontSize,
		fontFamily: el.fontFamily,
		fontWeight: el.fontWeight,
		fontStyle: el.fontStyle,
		letterSpacing: el.letterSpacing || "normal",
		textShadow: el.textShadow || "none",
		borderRadius: safeBorderRadius,
		border: borderWidth
			? `${borderWidth}px solid ${el.borderColor || "transparent"}`
			: "none",
		boxShadow: el.boxShadow || "none",
		width: "100%",
		height: "100%",
		padding: `${safePaddingY}px ${safePaddingX}px`,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		lineHeight: Number(el.lineHeight) || 1.2,
	};
}

function renderTextElementContent(el = {}) {
	const ornamentLeft = String(el.ornamentLeft || "").trim();
	const ornamentRight = String(el.ornamentRight || "").trim();
	const hasOrnaments = Boolean(ornamentLeft || ornamentRight);
	const ornamentStyle = {
		color: el.ornamentColor || "rgba(120, 80, 40, 0.5)",
		fontSize: "0.7em",
		fontWeight: 700,
		lineHeight: 1,
	};
	if (!hasOrnaments) return el.text;
	return (
		<>
			{ornamentLeft ? <span style={ornamentStyle}>{ornamentLeft}</span> : null}
			<span style={{ padding: "0 8px" }}>{el.text}</span>
			{ornamentRight ? <span style={ornamentStyle}>{ornamentRight}</span> : null}
		</>
	);
}

/**
 * ------------------------------------------------------------------------
 * PERMISSION HELPER (camera fallback)
 * ------------------------------------------------------------------------
 */
async function requestImagePermissions() {
	try {
		if (navigator?.mediaDevices?.getUserMedia) {
			await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment" },
				audio: false,
			});
			console.log("Camera permission requested as fallbackâ€¦");
		}
	} catch (err) {
		console.warn("User denied camera permission or device not supported:", err);
	}
}

/**
 * ------------------------------------------------------------------------
 * HELPER FUNCTIONS
 * ------------------------------------------------------------------------
 */
function stripHtmlTags(html) {
	if (!html) return "";
	return html.replace(/<[^>]*>?/gm, "");
}

function truncateText(text, wordLimit) {
	const words = text.split(/\s+/);
	if (words.length <= wordLimit) return text;
	return words.slice(0, wordLimit).join(" ") + "...";
}

function dataURLtoBlob(dataURL) {
	const [metadata, base64] = dataURL.split(",");
	const byteString = atob(base64);
	const mimeString = metadata.split(":")[1].split(";")[0];
	const buffer = new ArrayBuffer(byteString.length);
	const view = new Uint8Array(buffer);
	for (let i = 0; i < byteString.length; i++) {
		view[i] = byteString.charCodeAt(i);
	}
	return new Blob([buffer], { type: mimeString });
}

function compressCanvas(canvas, { mimeType = "image/png", quality = 1 } = {}) {
	// Force PNG to guarantee alpha channel
	const targetMime = "image/png";

	return new Promise((resolve, reject) => {
		/* Modern browsers â€“Â use toBlob (asynchronous, avoids memory bloat) */
		if (canvas.toBlob) {
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						return reject(new Error("Canvas is empty or toBlob() failed."));
					}
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result); // dataâ€‘URL string
					reader.onerror = (err) => reject(err);
					reader.readAsDataURL(blob);
				},
				targetMime,
				quality // ignored for PNG but harmless
			);
			return;
		}

		/* Fallback â€“ toDataURL then convert to Blob for parity */
		try {
			const dataURL = canvas.toDataURL(targetMime, quality);
			const blob = dataURLtoBlob(dataURL); // â† you already have this helper
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = (err) => reject(err);
			reader.readAsDataURL(blob);
		} catch (err) {
			reject(err);
		}
	});
}

async function convertHeicToJpegIfNeeded(file) {
	const fileType = file.type?.toLowerCase() || "";
	const fileName = file.name?.toLowerCase() || "";
	if (!fileType.includes("heic") && !fileName.endsWith(".heic")) {
		return file;
	}
	try {
		const convertedBlob = await heic2any({
			blob: file,
			toType: "image/jpeg",
			quality: 0.9,
		});
		const convertedFile = new File(
			[convertedBlob],
			file.name.replace(/\.heic$/i, ".jpg"),
			{
				type: "image/jpeg",
				lastModified: Date.now(),
			}
		);
		return convertedFile;
	} catch (err) {
		console.warn("HEIC conversion failed. Using original file:", err);
		return file;
	}
}

/**
 * Fallback #1: draw file to <canvas>
 */
async function fallbackCanvasConvert(file) {
	if (
		file.type?.toLowerCase().includes("video") ||
		file.name?.toLowerCase().endsWith(".mov")
	) {
		throw new Error(
			"This file is a video/Live Photo. Cannot convert to image."
		);
	}
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				ctx.drawImage(img, 0, 0);
				canvas.toBlob(
					(blob) => {
						if (!blob) return reject(new Error("Canvas toBlob returned null"));
						const newFile = new File([blob], file.name || "fallback.jpg", {
							type: "image/jpeg",
							lastModified: Date.now(),
						});
						resolve(newFile);
					},
					"image/jpeg",
					0.9
				);
			} catch (err) {
				reject(err);
			} finally {
				URL.revokeObjectURL(url);
			}
		};
		img.onerror = (err) => {
			URL.revokeObjectURL(url);
			reject(err);
		};
		img.src = url;
	});
}

/**
 * Fallback #2: use dom-to-image-more
 */
async function fallbackDomToImageConvert(file) {
	return new Promise((resolve, reject) => {
		const containerDiv = document.createElement("div");
		containerDiv.style.position = "absolute";
		containerDiv.style.top = "-9999px";
		containerDiv.style.left = "-9999px";
		containerDiv.style.opacity = "0";
		containerDiv.style.pointerEvents = "none";

		const img = new Image();
		img.crossOrigin = "anonymous";
		img.style.maxWidth = "100%";
		containerDiv.appendChild(img);
		document.body.appendChild(containerDiv);

		const objectURL = URL.createObjectURL(file);
		img.onload = async () => {
			try {
				const blob = await domtoimage.toBlob(containerDiv, {
					style: {
						transform: "scale(1)",
						transformOrigin: "top left",
					},
				});
				const newFile = new File(
					[blob],
					file.name || "fallback-domtoimage.jpg",
					{
						type: "image/jpeg",
						lastModified: Date.now(),
					}
				);
				document.body.removeChild(containerDiv);
				URL.revokeObjectURL(objectURL);
				resolve(newFile);
			} catch (err) {
				document.body.removeChild(containerDiv);
				URL.revokeObjectURL(objectURL);
				reject(err);
			}
		};
		img.onerror = (err) => {
			document.body.removeChild(containerDiv);
			URL.revokeObjectURL(objectURL);
			reject(err);
		};
		img.src = objectURL;
	});
}

async function fallbackVanillaJSXHRUpload(file, userId, token) {
	return new Promise((resolve, reject) => {
		const formData = new FormData();
		formData.append("image", file);
		formData.append("userId", userId);

		const xhr = new XMLHttpRequest();
		xhr.open(
			"POST",
			`${process.env.REACT_APP_API_URL}/admin/vanilla-upload`,
			true
		);
		xhr.setRequestHeader("Authorization", `Bearer ${token}`);

		xhr.onload = function () {
			if (xhr.status === 200) {
				try {
					const data = JSON.parse(xhr.responseText);
					if (data && data.public_id && data.url) {
						resolve({ public_id: data.public_id, url: data.url });
					} else {
						reject(
							new Error("Vanilla XHR: Missing public_id or url in response.")
						);
					}
				} catch (e) {
					reject(new Error("Vanilla XHR: Could not parse JSON response."));
				}
			} else {
				reject(
					new Error(`Vanilla XHR: Upload failed with status ${xhr.status}`)
				);
			}
		};
		xhr.onerror = function () {
			reject(new Error("Vanilla XHR: Network error or CORS blocked."));
		};
		xhr.send(formData);
	});
}

/**
 * ------------------------------------------------------------------------
 * The main component
 * ------------------------------------------------------------------------
 */
export default function CustomizeSelectedProduct() {
	const { productId, productSlug } = useParams();
	const history = useHistory();
	const location = useLocation();
	const routeBootstrap = useLegacyRouteBootstrap();
	const initialPodBootstrap = useMemo(() => {
		if (
			routeBootstrap?.type === "pod-product" &&
			routeBootstrap?.productId === productId
		) {
			return routeBootstrap;
		}
		return null;
	}, [productId, routeBootstrap]);

	const initialPersonalization = resolvePodPersonalization(location.search);
	const [selectedOccasion, setSelectedOccasion] = useState(
		initialPersonalization.occasion
	);
	const [selectedGiftName, setSelectedGiftName] = useState(
		initialPersonalization.name
	);
	const [advancedEditMode, setAdvancedEditMode] = useState(() => {
		try {
			const stored = localStorage.getItem(POD_ADVANCED_MODE_KEY);
			if (stored === null) return true;
			return stored === "true";
		} catch {
			return true;
		}
	});
	const occasionStylePreset = useMemo(
		() => getOccasionDesignPreset(selectedOccasion),
		[selectedOccasion]
	);
	const selectedOccasionMeta = useMemo(
		() => getOccasionOption(selectedOccasion),
		[selectedOccasion]
	);

	const syncPersonalization = (occasion, name) => {
		const safe = savePodPersonalization({ occasion, name });
		setSelectedOccasion(safe.occasion);
		setSelectedGiftName(safe.name);
		return safe;
	};

	const handleAdvancedModeChange = (checked) => {
		setAdvancedEditMode(!!checked);
		try {
			localStorage.setItem(POD_ADVANCED_MODE_KEY, String(!!checked));
		} catch {
			// localStorage may be unavailable in strict privacy mode
		}
	};

	function toPodSlug(name = "") {
		return (name || "custom-gift")
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");
	}

	function buildCanonicalVariantSearch({
		occasion = "",
		color = "",
		size = "",
		scent = "",
	} = {}) {
		const params = new URLSearchParams();
		if (occasion) params.set("occasion", occasion);
		if (color) params.set("color", color);
		if (size) params.set("size", size);
		if (scent) params.set("scent", scent);
		return params.toString();
	}

	function findProductOption(currentProduct, target = "") {
		return findPodProductOption(currentProduct, target);
	}

	function resolveClosestVariantSelection(currentProduct, requested = {}) {
		if (!currentProduct?.variants?.length) {
			return {
				color: requested.color || "",
				size: requested.size || "",
				scent: requested.scent || "",
			};
		}

		const colorOpt = findProductOption(currentProduct, "color");
		const sizeOpt = findProductOption(currentProduct, "size");
		const scentOpt = findProductOption(currentProduct, "scent");
		const numOrStr = (value) =>
			typeof value === "number" ? value : parseInt(value, 10);
		const findOptionValue = (option, title) =>
			option?.values?.find((value) => value.title === title) || null;
		const requestedColor = findOptionValue(colorOpt, requested.color);
		const requestedSize = findOptionValue(sizeOpt, requested.size);
		const requestedScent = findOptionValue(scentOpt, requested.scent);
		const variants = currentProduct.variants.filter(
			(variant) => variant?.is_enabled !== false
		);
		if (!variants.length) {
			return {
				color: requested.color || "",
				size: requested.size || "",
				scent: requested.scent || "",
			};
		}

		let bestVariant = variants[0];
		let bestScore = Number.NEGATIVE_INFINITY;
		for (const variant of variants) {
			const variantIds = variant.options.map(numOrStr);
			let score = variant.is_default ? 5 : 0;
			if (requestedColor) {
				score += variantIds.includes(numOrStr(requestedColor.id)) ? 100 : -100;
			}
			if (requestedSize) {
				score += variantIds.includes(numOrStr(requestedSize.id)) ? 60 : -60;
			}
			if (requestedScent) {
				score += variantIds.includes(numOrStr(requestedScent.id)) ? 30 : -30;
			}
			if (score > bestScore) {
				bestScore = score;
				bestVariant = variant;
			}
		}

		const pickTitle = (option) => {
			if (!option?.values?.length) return "";
			const match = option.values.find((value) =>
				bestVariant.options.map(numOrStr).includes(numOrStr(value.id))
			);
			return match?.title || "";
		};

		return {
			color: pickTitle(colorOpt) || requested.color || "",
			size: pickTitle(sizeOpt) || requested.size || "",
			scent: pickTitle(scentOpt) || requested.scent || "",
		};
	}

	const [product, setProduct] = useState(() => initialPodBootstrap?.product || null);
	const [loading, setLoading] = useState(() => !initialPodBootstrap?.product);
	const printAreaFrame = useMemo(
		() => getPodPrintAreaFrame(product || {}),
		[product],
	);
	const printifySafeInsetPercent = useMemo(
		() => getPodPrintifySafeInsetPercent(product || {}),
		[product],
	);

	const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

	// selected color, size, scent
	const [selectedColor, setSelectedColor] = useState(
		() => initialPodBootstrap?.selection?.color || ""
	);
	const [selectedSize, setSelectedSize] = useState(
		() => initialPodBootstrap?.selection?.size || ""
	);
	const [selectedScent, setSelectedScent] = useState(
		() => initialPodBootstrap?.selection?.scent || ""
	);
	const effectiveOccasionStylePreset = useMemo(
		() => occasionStylePreset,
		[occasionStylePreset],
	);

	// Current text styling
	const [userText, setUserText] = useState("");
	const [textColor, setTextColor] = useState("#000000");
	const [fontFamily, setFontFamily] = useState("Arial");
	const [fontSize, setFontSize] = useState(24);
	const [fontWeight, setFontWeight] = useState("normal");
	const [fontStyle, setFontStyle] = useState("normal");
	const [borderRadius, setBorderRadius] = useState(0);

	// All design elements (text or images)
	const [elements, setElements] = useState([]);
	const [selectedElementId, setSelectedElementId] = useState(null);
	const [inlineEditId, setInlineEditId] = useState(null);
	const [inlineEditText, setInlineEditText] = useState("");

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

	const [isMobile, setIsMobile] = useState(window.innerWidth < 800);
	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 800);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		const resolved = resolvePodPersonalization(location.search);
		setSelectedOccasion(resolved.occasion);
		setSelectedGiftName(resolved.name);
		savePodPersonalization(resolved);
	}, [location.search]);

	useEffect(() => {
		// Keep text-tool defaults aligned with the selected occasion preset.
		setTextColor(effectiveOccasionStylePreset.textColor);
		setFontFamily(effectiveOccasionStylePreset.fontFamily);
		setFontSize(effectiveOccasionStylePreset.fontSize);
		setFontWeight(effectiveOccasionStylePreset.fontWeight);
		setFontStyle(effectiveOccasionStylePreset.fontStyle);
		setBorderRadius(effectiveOccasionStylePreset.borderRadius);
	}, [effectiveOccasionStylePreset]);

	const { addToCart, openSidebar2 } = useCartContext();
	const { user, token } = isAuthenticated();

	// fallback user ID / token
	const fallbackUserId = user?._id || "663539b4eb1a090ebd349d65";
	const fallbackToken = token || "token";

	// Refs for screenshot
	const sliderRef = useRef(null);
	const designOverlayRef = useRef(null);
	const bareDesignRef = useRef(null);
	const printAreaRef = useRef(null);
	const barePrintAreaRef = useRef(null);

	// For mobile text modal
	const [textModalVisible, setTextModalVisible] = useState(false);
	const [mobileTextInput, setMobileTextInput] = useState("");

	// For separate "gallery" vs "camera"
	const hiddenGalleryInputRef = useRef(null);
	const hiddenCameraInputRef = useRef(null);
	const copiedElementRef = useRef(null);
	const pasteCountRef = useRef(0);
	const frameContextMenuRef = useRef(null);
	const [frameContextMenu, setFrameContextMenu] = useState({
		visible: false,
		x: 0,
		y: 0,
		targetId: null,
	});

	// Desktop drag/drop
	const { getRootProps, getInputProps } = useDropzone({
		accept: {
			"image/*": [
				".jpg",
				".jpeg",
				".png",
				".gif",
				".webp",
				".heic",
				".HEIC",
				".heif",
				".HEIF",
			],
		},
		onDrop: (acceptedFiles) => {
			try {
				if (ReactGA && typeof ReactGA.event === "function") {
					ReactGA.event({
						category: "User Uploaded Image In Custom Design",
						action: "User Uploaded Image In Custom Design",
						label: "User Uploaded Image In Custom Design",
					});
					ReactPixel.track("CustomizeProduct", {
						content_name: product?.title || product?.productName,
						content_ids: [product?._id],
						content_type: "product",
					});
				}
			} catch {}
			acceptedFiles.forEach((file) => addImageElement(file));
		},
	});

	const [isAddToCartDisabled, setIsAddToCartDisabled] = useState(false);
	const [showTooltipForText, setShowTooltipForText] = useState(null);
	const [isRotating, setIsRotating] = useState(false);
	const rotationData = useRef({
		rotatingElementId: null,
		startAngle: 0,
		startRotation: 0,
	});
	const [defaultTextAdded, setDefaultTextAdded] = useState(false);

	const [showMobileButtons] = useState(true);

	const [uploadingImage, setUploadingImage] = useState(false);

	// Additional states to track user actions
	const [hasChangedSizeOrColor, setHasChangedSizeOrColor] = useState(false);

	useEffect(() => {
		setElements([]);
		setSelectedElementId(null);
		setInlineEditId(null);
		setInlineEditText("");
		setDefaultTextAdded(false);
		setIsDescriptionExpanded(false);
		setHasChangedSizeOrColor(false);
		setSelectedColor(initialPodBootstrap?.selection?.color || "");
		setSelectedSize(initialPodBootstrap?.selection?.size || "");
		setSelectedScent(initialPodBootstrap?.selection?.scent || "");
		setOrder((prev) => ({
			...prev,
			product_id: productId || null,
			variant_id: null,
			customizations: { texts: [], images: [] },
		}));
	}, [initialPodBootstrap, productId]);

	/**
	 * ----------------------------------------------------------------
	 * 1) LOAD PRODUCT
	 * ----------------------------------------------------------------
	 */
	useEffect(() => {
		let isActive = true;

		const applyResolvedProduct = (rawProduct) => {
			if (!isActive) return false;
			const normalizedProduct = normalizePodProduct(rawProduct);
			if (!normalizedProduct) {
				message.error("Product not found or no data returned.");
				setLoading(false);
				return false;
			}
			if (!normalizedProduct.variants.length) {
				message.error("No valid variants with pricing were found.");
				setLoading(false);
				return false;
			}

			setProduct(normalizedProduct);
			setLoading(false);

			const canonicalSlug = toPodSlug(
				normalizedProduct.title || normalizedProduct.productName
			);
			if (canonicalSlug && canonicalSlug !== productSlug) {
				history.replace(
					`/custom-gifts/${canonicalSlug}/${productId}${location.search}`
				);
			}
			return true;
		};

		if (initialPodBootstrap?.product && initialPodBootstrap.productId === productId) {
			applyResolvedProduct(initialPodBootstrap.product);
			return () => {
				isActive = false;
			};
		}

		setLoading(true);
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
				applyResolvedProduct(response.data);
			} catch (err) {
				console.error(err);
				message.error("Failed to load product details.");
				setLoading(false);
			}
		};
		fetchProduct();
		return () => {
			isActive = false;
		};
	}, [history, initialPodBootstrap, productId, productSlug]);

	useEffect(() => {
		if (!product?._id) return;
		ReactPixel.track("CustomizeProduct", {
			content_name: product.title || product.productName,
			content_ids: [product._id],
			content_type: "product",
		});
	}, [product?._id, product?.productName, product?.title]);

	useEffect(() => {
		if (!product) return;
		const queryParams = new URLSearchParams(location.search);
		const resolvedSelection = resolveInitialPodVariantSelection(product, {
			color: queryParams.get("color") || "",
			size: queryParams.get("size") || "",
			scent: queryParams.get("scent") || "",
		});

		if ((resolvedSelection.color || "") !== selectedColor) {
			setSelectedColor(resolvedSelection.color || "");
		}
		if ((resolvedSelection.size || "") !== selectedSize) {
			setSelectedSize(resolvedSelection.size || "");
		}
		if ((resolvedSelection.scent || "") !== selectedScent) {
			setSelectedScent(resolvedSelection.scent || "");
		}
	}, [location.search, product]);

	/**
	 * 2) Add a default text box in the middle
	 */
	useEffect(() => {
		if (!product || defaultTextAdded) return;
		if (!printAreaRef.current) return;

		const boundingRect = printAreaRef.current.getBoundingClientRect();
		const safeBounds = resolvePrintifySafeBounds(
			boundingRect.width,
			boundingRect.height,
			printifySafeInsetPercent
		);
		const safeStartX = safeBounds.minX;
		const safeStartY = safeBounds.minY;
		const safeWidth = Math.max(120, safeBounds.maxX - safeBounds.minX);
		const safeHeight = Math.max(90, safeBounds.maxY - safeBounds.minY);
		const geometry = resolveAutoDesignGeometry(
			product,
			effectiveOccasionStylePreset,
		);

		const messageWidth = Math.min(
			Math.round(safeWidth * 0.72),
			Math.max(124, Math.round(safeWidth * geometry.messageWidthRatio))
		);
		const messageHeight = Math.min(
			geometry.maxMessageHeight || 74,
			Math.max(42, Math.round(safeHeight * geometry.messageHeightRatio))
		);
		const iconSize = Math.min(
			geometry.maxIconSize || 44,
			Math.max(24, Math.round(safeWidth * geometry.iconSizeRatio)),
		);
		const messageYCenter = safeStartY + safeHeight * geometry.messageCenterYRatio;

		const messageX = safeStartX + Math.round((safeWidth - messageWidth) / 2);
		let messageY = Math.round(messageYCenter - messageHeight / 2);
		messageY = Math.max(
			safeStartY + iconSize - geometry.iconOverlapPx + 2,
			Math.min(messageY, safeStartY + safeHeight - messageHeight)
		);
		const iconX = safeStartX + Math.round((safeWidth - iconSize) / 2);
		const iconY = Math.max(
			safeStartY,
			Math.min(messageY - 2, messageY - iconSize + geometry.iconOverlapPx)
		);
		const messageFontSize = clampNumber(
			Math.round(messageHeight * 0.3),
			13,
			20,
		);
		const iconFontSize = clampNumber(
			Math.round(iconSize * 0.48),
			16,
			26,
		);
		const messageGradientStart =
			effectiveOccasionStylePreset.messageGradientStart ||
			effectiveOccasionStylePreset.backgroundColor;
		const messageGradientEnd =
			effectiveOccasionStylePreset.messageGradientEnd ||
			effectiveOccasionStylePreset.backgroundColor;
		const messageBorderWidth = clampNumber(
			Number(effectiveOccasionStylePreset.messageBorderWidth) || 2,
			1,
			4,
		);
		const iconGradientStart =
			effectiveOccasionStylePreset.accentBackgroundColor ||
			effectiveOccasionStylePreset.messageGradientStart ||
			"#ffffff";
		const iconGradientEnd =
			effectiveOccasionStylePreset.accentBackgroundColor2 ||
			effectiveOccasionStylePreset.accentBackgroundColor ||
			"#f3f4f6";
		const baseId = Date.now();

		const messageEl = {
			id: baseId,
			type: "text",
			text: buildGiftMessage(selectedOccasion, selectedGiftName),
			color: effectiveOccasionStylePreset.textColor,
			backgroundColor: effectiveOccasionStylePreset.backgroundColor,
			backgroundImage: `linear-gradient(140deg, ${messageGradientStart} 0%, ${messageGradientEnd} 100%)`,
			fontFamily: effectiveOccasionStylePreset.fontFamily,
			fontSize: messageFontSize,
			fontWeight: effectiveOccasionStylePreset.fontWeight,
			fontStyle: effectiveOccasionStylePreset.fontStyle,
			letterSpacing: effectiveOccasionStylePreset.letterSpacing || "0.08px",
			textShadow:
				effectiveOccasionStylePreset.textShadow ||
				"0 1px 2px rgba(16, 33, 24, 0.16)",
			borderRadius: effectiveOccasionStylePreset.borderRadius,
			borderColor:
				effectiveOccasionStylePreset.messageBorderColor ||
				effectiveOccasionStylePreset.accentBorderColor ||
				"rgba(31, 41, 55, 0.2)",
			borderWidth: messageBorderWidth,
			boxShadow:
				effectiveOccasionStylePreset.messageShadow ||
				"0 6px 16px rgba(16, 33, 24, 0.12)",
			lineHeight: 1.08,
			paddingX: clampNumber(
				Number(effectiveOccasionStylePreset.paddingX) ||
					Math.round(messageWidth * 0.055),
				8,
				20,
			),
			paddingY: clampNumber(
				Number(effectiveOccasionStylePreset.paddingY) ||
					Math.round(messageHeight * 0.09),
				4,
				10,
			),
			ornamentLeft: effectiveOccasionStylePreset.ornamentLeft || "",
			ornamentRight: effectiveOccasionStylePreset.ornamentRight || "",
			ornamentColor:
				effectiveOccasionStylePreset.ornamentColor ||
				"rgba(16, 33, 24, 0.35)",
			rotation: 0,
			x: messageX,
			y: messageY,
			width: messageWidth,
			height: messageHeight,
			wasReset: false,
			isAutoGenerated: true,
			autoKind: "message",
		};

		const iconEl = {
			id: baseId + 1,
			type: "text",
			text: effectiveOccasionStylePreset.accentIcon || selectedOccasionMeta.icon,
			color: effectiveOccasionStylePreset.accentTextColor,
			backgroundColor: effectiveOccasionStylePreset.accentBackgroundColor,
			backgroundImage: `linear-gradient(145deg, ${iconGradientStart} 0%, ${iconGradientEnd} 100%)`,
			fontFamily: effectiveOccasionStylePreset.fontFamily,
			fontSize: iconFontSize,
			fontWeight: "600",
			fontStyle: "normal",
			textShadow:
				effectiveOccasionStylePreset.textShadow ||
				"0 1px 2px rgba(16, 33, 24, 0.16)",
			borderRadius: 999,
			borderColor:
				effectiveOccasionStylePreset.accentBorderColor ||
				"rgba(31, 41, 55, 0.2)",
			borderWidth: clampNumber(
				Number(effectiveOccasionStylePreset.accentBorderWidth) || 2,
				1,
				3,
			),
			boxShadow:
				effectiveOccasionStylePreset.accentShadow ||
				"0 5px 13px rgba(16, 33, 24, 0.1)",
			paddingX: 1,
			paddingY: 1,
			lineHeight: 1,
			rotation: 0,
			x: iconX,
			y: iconY,
			width: iconSize,
			height: iconSize,
			wasReset: false,
			isAutoGenerated: true,
			autoKind: "icon",
		};

		setElements((prev) => [...prev, messageEl, iconEl]);
		setSelectedElementId(messageEl.id);
		setDefaultTextAdded(true);
	}, [
		defaultTextAdded,
		effectiveOccasionStylePreset,
		product,
		selectedGiftName,
		selectedOccasionMeta.icon,
		selectedOccasion,
		printifySafeInsetPercent,
	]);

	useEffect(() => {
		const autoMessage = buildGiftMessage(selectedOccasion, selectedGiftName);
		const autoIcon =
			effectiveOccasionStylePreset.accentIcon || selectedOccasionMeta.icon;
		const messageGradientStart =
			effectiveOccasionStylePreset.messageGradientStart ||
			effectiveOccasionStylePreset.backgroundColor;
		const messageGradientEnd =
			effectiveOccasionStylePreset.messageGradientEnd ||
			effectiveOccasionStylePreset.backgroundColor;
		const iconGradientStart =
			effectiveOccasionStylePreset.accentBackgroundColor ||
			effectiveOccasionStylePreset.messageGradientStart ||
			"#ffffff";
		const iconGradientEnd =
			effectiveOccasionStylePreset.accentBackgroundColor2 ||
			effectiveOccasionStylePreset.accentBackgroundColor ||
			"#f3f4f6";
		setElements((prev) => {
			const next = prev.map((item) => {
				if (item.type !== "text" || !item.isAutoGenerated) return item;
				if (item.autoKind === "icon") {
					const iconFontSize = clampNumber(
						Math.round((item.height || 36) * 0.48),
						16,
						26,
					);
					return {
						...item,
						text: autoIcon,
						color: effectiveOccasionStylePreset.accentTextColor,
						backgroundColor: effectiveOccasionStylePreset.accentBackgroundColor,
						backgroundImage: `linear-gradient(145deg, ${iconGradientStart} 0%, ${iconGradientEnd} 100%)`,
						fontFamily: effectiveOccasionStylePreset.fontFamily,
						fontSize: iconFontSize,
						fontWeight: "600",
						fontStyle: "normal",
						textShadow:
							effectiveOccasionStylePreset.textShadow ||
							"0 1px 2px rgba(16, 33, 24, 0.16)",
						borderRadius: 999,
						borderColor:
							effectiveOccasionStylePreset.accentBorderColor ||
							"rgba(31, 41, 55, 0.2)",
						borderWidth: clampNumber(
							Number(effectiveOccasionStylePreset.accentBorderWidth) || 2,
							1,
							3,
						),
						boxShadow:
							effectiveOccasionStylePreset.accentShadow ||
							"0 5px 13px rgba(16, 33, 24, 0.1)",
						paddingX: 1,
						paddingY: 1,
						lineHeight: 1,
					};
				}

				const messageFontSize = clampNumber(
					Math.round((item.height || 56) * 0.3),
					13,
					20,
				);
				return {
					...item,
					text: autoMessage,
					color: effectiveOccasionStylePreset.textColor,
					backgroundColor: effectiveOccasionStylePreset.backgroundColor,
					backgroundImage: `linear-gradient(140deg, ${messageGradientStart} 0%, ${messageGradientEnd} 100%)`,
					fontFamily: effectiveOccasionStylePreset.fontFamily,
					fontSize: messageFontSize,
					fontWeight: effectiveOccasionStylePreset.fontWeight,
					fontStyle: effectiveOccasionStylePreset.fontStyle,
					letterSpacing: effectiveOccasionStylePreset.letterSpacing || "0.08px",
					textShadow:
						effectiveOccasionStylePreset.textShadow ||
						"0 1px 2px rgba(16, 33, 24, 0.16)",
					borderRadius: effectiveOccasionStylePreset.borderRadius,
					borderColor:
						effectiveOccasionStylePreset.messageBorderColor ||
						effectiveOccasionStylePreset.accentBorderColor ||
						"rgba(31, 41, 55, 0.2)",
					borderWidth: clampNumber(
						Number(effectiveOccasionStylePreset.messageBorderWidth) || 2,
						1,
						4,
					),
					boxShadow:
						effectiveOccasionStylePreset.messageShadow ||
						"0 6px 16px rgba(16, 33, 24, 0.12)",
					lineHeight: 1.08,
					paddingX: clampNumber(
						Number(effectiveOccasionStylePreset.paddingX) ||
							Math.round((item.width || 180) * 0.055),
						8,
						20,
					),
					paddingY: clampNumber(
						Number(effectiveOccasionStylePreset.paddingY) ||
							Math.round((item.height || 56) * 0.09),
						4,
						10,
					),
					ornamentLeft: effectiveOccasionStylePreset.ornamentLeft || "",
					ornamentRight: effectiveOccasionStylePreset.ornamentRight || "",
					ornamentColor:
						effectiveOccasionStylePreset.ornamentColor ||
						"rgba(16, 33, 24, 0.35)",
				};
			});
			return next;
		});
	}, [
		effectiveOccasionStylePreset,
		selectedGiftName,
		selectedOccasion,
		selectedOccasionMeta.icon,
	]);

	/**
	 * 3) Whenever color/size/scent changes => update variant_id
	 */
	useEffect(() => {
		if (!product) return;
		function numOrStr(x) {
			return typeof x === "number" ? x : parseInt(x, 10);
		}

		const colorOpt = findProductOption(product, "color");
		const sizeOpt = findProductOption(product, "size");
		const scentOpt = findProductOption(product, "scent");

		let matchingVariant = null;
		// gather chosen IDs
		const chosenIds = [];
		if (colorOpt && selectedColor) {
			const cVal = colorOpt.values.find((v) => v.title === selectedColor);
			if (cVal) chosenIds.push(numOrStr(cVal.id));
		}
		if (sizeOpt && selectedSize) {
			const sVal = sizeOpt.values.find((v) => v.title === selectedSize);
			if (sVal) chosenIds.push(numOrStr(sVal.id));
		}
		if (scentOpt && selectedScent) {
			const scVal = scentOpt.values.find((v) => v.title === selectedScent);
			if (scVal) chosenIds.push(numOrStr(scVal.id));
		}

		matchingVariant = product.variants.find((v) => {
			const varIds = v.options.map(numOrStr);
			return chosenIds.every((ch) => varIds.includes(ch));
		});

		setOrder((prev) => ({ ...prev, variant_id: matchingVariant?.id || null }));
	}, [product, selectedColor, selectedSize, selectedScent]);

	useEffect(() => {
		if (!product) return;
		const safe = savePodPersonalization({
			occasion: selectedOccasion,
			name: selectedGiftName,
		});

		const params = new URLSearchParams(location.search);
		params.set("occasion", safe.occasion);
		if (safe.name) params.set("name", safe.name);
		else params.delete("name");

		if (selectedColor) params.set("color", selectedColor);
		else params.delete("color");

		if (selectedSize) params.set("size", selectedSize);
		else params.delete("size");

		if (selectedScent) params.set("scent", selectedScent);
		else params.delete("scent");

		const nextSearch = `?${params.toString()}`;
		if (nextSearch !== location.search) {
			history.replace({ pathname: location.pathname, search: nextSearch });
		}
	}, [
		history,
		location.pathname,
		location.search,
		product,
		selectedColor,
		selectedGiftName,
		selectedOccasion,
		selectedScent,
		selectedSize,
	]);

	useEffect(() => {
		if (!product?.variants?.length) return;
		const resolved = resolveClosestVariantSelection(product, {
			color: selectedColor,
			size: selectedSize,
			scent: selectedScent,
		});
		if (resolved.color && resolved.color !== selectedColor) {
			setSelectedColor(resolved.color);
		}
		if (resolved.size !== selectedSize) {
			setSelectedSize(resolved.size || "");
		}
		if (resolved.scent !== selectedScent) {
			setSelectedScent(resolved.scent || "");
		}
	}, [product, selectedColor, selectedSize, selectedScent]);

	// If user changes color/size/scent => setHasChanged
	useEffect(() => {
		if (
			!hasChangedSizeOrColor &&
			(selectedColor || selectedSize || selectedScent)
		) {
			setHasChangedSizeOrColor(true);
		}
	}, [selectedColor, selectedSize, selectedScent, hasChangedSizeOrColor]);

	/**
	 * We already have "variantExistsForOption" for size:
	 */
	function variantExistsForOption(sizeObj, colorTitle, scentTitle) {
		if (!product) return false;

		const colorOpt = findProductOption(product, "color");
		const scentOpt = findProductOption(product, "scent");

		function numOrStr(val) {
			return typeof val === "number" ? val : parseInt(val, 10);
		}

		let chosenColorId = null;
		if (colorOpt && colorTitle) {
			const colorVal = colorOpt.values.find((v) => v.title === colorTitle);
			if (!colorVal) return false;
			chosenColorId = numOrStr(colorVal.id);
		}

		let sizeValId = sizeObj ? numOrStr(sizeObj.id) : null;
		let chosenScentId = null;
		if (scentOpt && scentTitle) {
			const scVal = scentOpt.values.find((v) => v.title === scentTitle);
			if (scVal) chosenScentId = numOrStr(scVal.id);
		}

		return product.variants.some((v) => {
			const varIds = v.options.map(numOrStr);
			if (chosenColorId != null && !varIds.includes(chosenColorId)) {
				return false;
			}
			if (sizeValId != null && !varIds.includes(sizeValId)) {
				return false;
			}
			if (chosenScentId != null && !varIds.includes(chosenScentId)) {
				return false;
			}
			return true;
		});
	}

	function variantExistsForScent(scentObj, colorTitle, sizeTitle) {
		if (!product) return false;
		const colorOpt = findProductOption(product, "color");
		const sizeOpt = findProductOption(product, "size");

		function numOrStr(val) {
			return typeof val === "number" ? val : parseInt(val, 10);
		}

		let chosenColorId = null;
		if (colorOpt && colorTitle) {
			const colorVal = colorOpt.values.find((v) => v.title === colorTitle);
			if (!colorVal) return false;
			chosenColorId = numOrStr(colorVal.id);
		}
		let chosenSizeId = null;
		if (sizeOpt && sizeTitle) {
			const sizeVal = sizeOpt.values.find((v) => v.title === sizeTitle);
			if (sizeVal) chosenSizeId = numOrStr(sizeVal.id);
		}
		let thisScentId = scentObj ? numOrStr(scentObj.id) : null;
		if (!thisScentId) return false;

		return product.variants.some((v) => {
			const varIds = v.options.map(numOrStr);

			if (chosenColorId != null && !varIds.includes(chosenColorId)) {
				return false;
			}
			if (chosenSizeId != null && !varIds.includes(chosenSizeId)) {
				return false;
			}
			if (!varIds.includes(thisScentId)) {
				return false;
			}
			return true;
		});
	}

	/**
	 * 4) IMAGE UPLOAD LOGIC
	 */
	function handleBlankAreaDoubleClick(e) {
		// Reserved hook for future tutorial interactions.
		if (!e.target.closest(".rnd-element")) return;
	}

	const addImageElement = async (file) => {
		// if .mov => error
		if (
			file.type?.toLowerCase().includes("video") ||
			file.name?.toLowerCase().endsWith(".mov")
		) {
			message.error(
				"This file is a video/Live Photo. Please select a standard image."
			);
			return;
		}
		setUploadingImage(true);
		try {
			// 1) heic => jpeg
			let workingFile = await convertHeicToJpegIfNeeded(file);

			// 2) direct
			try {
				await uploadDirectly(workingFile);
			} catch (err1) {
				console.warn("Direct upload failed; try resizing...", err1);
				try {
					await handleImageResizingThenUpload(workingFile);
				} catch (err2) {
					console.warn("Resizing failed; fallback to canvas...", err2);
					try {
						const fallbackFile = await fallbackCanvasConvert(workingFile);
						await uploadDirectly(fallbackFile);
					} catch (err3) {
						console.warn(
							"Canvas fallback also failed; try dom-to-image...",
							err3
						);
						try {
							const fallbackFile2 =
								await fallbackDomToImageConvert(workingFile);
							await uploadDirectly(fallbackFile2);
						} catch (err4) {
							console.warn(
								"dom-to-image fallback also failed => final attempt XHR.",
								err4
							);
							try {
								const { public_id, url } = await fallbackVanillaJSXHRUpload(
									workingFile,
									fallbackUserId,
									fallbackToken
								);
								await addImageElementToCanvas(public_id, url);
							} catch (finalErr) {
								console.error(
									"All fallback attempts for upload failed!",
									finalErr
								);
								// try requestImagePermissions => re-try
								try {
									await requestImagePermissions();
									message.info(
										"Trying final fallback once more with permission granted..."
									);
									const { public_id, url } = await fallbackVanillaJSXHRUpload(
										workingFile,
										fallbackUserId,
										fallbackToken
									);
									await addImageElementToCanvas(public_id, url);
								} catch (permFail) {
									console.error(
										"Even after permissions, final attempt failed.",
										permFail
									);
									message.error(
										"We encountered an issue uploading your image. Please try again or pick a different photo."
									);
								}
							}
						}
					}
				}
			}
		} catch (finalErr) {
			console.error("Image upload (all attempts) failed:", finalErr);
			message.error(
				"We encountered an issue uploading your image. Please try again."
			);
		} finally {
			setUploadingImage(false);
		}
	};

	async function uploadDirectly(file) {
		const base64Image = await convertToBase64(file);
		const { public_id, url } = await cloudinaryUpload1(
			fallbackUserId,
			fallbackToken,
			{
				image: base64Image,
			}
		);
		if (!public_id || !url) {
			throw new Error("Missing public_id or url from direct upload response");
		}
		await addImageElementToCanvas(public_id, url);
	}

	async function handleImageResizingThenUpload(file) {
		const resizedFile = await resizeImage(file, 1200);
		const base64Image = await convertToBase64(resizedFile);
		const { public_id, url } = await cloudinaryUpload1(
			fallbackUserId,
			fallbackToken,
			{
				image: base64Image,
			}
		);
		if (!public_id || !url) {
			throw new Error("Missing public_id or url after resizing");
		}
		await addImageElementToCanvas(public_id, url);
	}

	function getImageNaturalSize(url) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () =>
				resolve({
					width: Math.max(1, Number(img.naturalWidth) || 1),
					height: Math.max(1, Number(img.naturalHeight) || 1),
				});
			img.onerror = reject;
			img.src = url;
		});
	}

	async function addImageElementToCanvas(public_id, url) {
		if (!printAreaRef.current) return;
		const boundingRect = printAreaRef.current.getBoundingClientRect();
		const safeBounds = resolvePrintifySafeBounds(
			boundingRect.width,
			boundingRect.height,
			printifySafeInsetPercent
		);
		const safeWidth = Math.max(80, safeBounds.maxX - safeBounds.minX);
		const safeHeight = Math.max(80, safeBounds.maxY - safeBounds.minY);
		let naturalWidth = 1;
		let naturalHeight = 1;
		try {
			const naturalSize = await getImageNaturalSize(url);
			naturalWidth = naturalSize.width;
			naturalHeight = naturalSize.height;
		} catch {
			naturalWidth = 1;
			naturalHeight = 1;
		}

		const ratio = Math.max(0.1, naturalWidth / naturalHeight);
		const maxStartWidth = Math.max(90, safeWidth * 0.58);
		const maxStartHeight = Math.max(90, safeHeight * 0.58);
		let imgWidth = maxStartWidth;
		let imgHeight = imgWidth / ratio;
		if (imgHeight > maxStartHeight) {
			imgHeight = maxStartHeight;
			imgWidth = imgHeight * ratio;
		}
		imgWidth = clampNumber(imgWidth, 72, safeWidth);
		imgHeight = clampNumber(imgHeight, 72, safeHeight);
		const centerX = safeBounds.minX + (safeWidth - imgWidth) / 2;
		const centerY = safeBounds.minY + (safeHeight - imgHeight) / 2;

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
	}

	function removeImageBackground(oldUrl) {
		if (!oldUrl.includes("/upload/")) {
			return oldUrl;
		}
		return oldUrl.replace("/upload/", "/upload/e_background_removal/");
	}

	async function resizeImage(file, maxSize) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const canvas = document.createElement("canvas");
			const reader = new FileReader();

			reader.onload = (e) => {
				img.src = e.target.result;
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);

			img.onload = () => {
				let width = img.width;
				let height = img.height;
				if (width > height && width > maxSize) {
					height = Math.round((height * maxSize) / width);
					width = maxSize;
				} else if (height > width && height > maxSize) {
					width = Math.round((width * maxSize) / height);
					height = maxSize;
				}
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (!blob) {
							return reject(new Error("Canvas is empty."));
						}
						const resizedFile = new File([blob], file.name, {
							type: "image/jpeg",
							lastModified: Date.now(),
						});
						resolve(resizedFile);
					},
					"image/jpeg",
					0.9
				);
			};
			img.onerror = (err) => reject(err);
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

	/**
	 * 5) TEXT + ELEMENT EDITING
	 */
	function addTextElement(textValue, fromRightSide = false) {
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
			isAutoGenerated: false,
		};
		setElements((prev) => [...prev, newEl]);
	}

	function handleElementClick(el) {
		setElements((prev) => {
			const rest = prev.filter((item) => item.id !== el.id);
			return [...rest, el];
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

	function handleTextDoubleClick(el) {
		setInlineEditText(el.text || "");
		setInlineEditId(el.id);
	}

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
				item.id === elId
					? { ...item, text: inlineEditText, isAutoGenerated: false }
					: item
			)
		);
		setInlineEditId(null);
	}

	async function deleteSelectedElement(elId) {
		const el = elements.find((x) => x.id === elId);
		if (!el) return;

		if (el.type === "image" && el.public_id) {
			try {
				await axios.post(
					`${process.env.REACT_APP_API_URL}/admin/removeimage/${fallbackUserId}`,
					{ public_id: el.public_id },
					{ headers: { Authorization: `Bearer ${fallbackToken}` } }
				);
				message.success("Image Successfully Deleted.");
			} catch (error) {
				console.error("Failed to delete image:", error);
				message.error("Failed to delete image from server.");
			}
		}
		setElements((prev) => prev.filter((item) => item.id !== elId));
		setSelectedElementId(null);
	}

	const [showCenterGuides, setShowCenterGuides] = useState({
		vertical: false,
		horizontal: false,
	});
	const [forceDragRelease, setForceDragRelease] = useState(false);
	const dragSessionRef = useRef(false);
	const dragReleaseTimerRef = useRef(null);
	const dragPositionRafRef = useRef(null);
	const dragPositionPendingRef = useRef(null);
	const dragLastPositionRef = useRef({
		elementId: null,
		x: null,
		y: null,
	});
	const dragGeometryRef = useRef({
		ready: false,
		containerCenterX: 0,
		containerCenterY: 0,
		safeBounds: null,
	});
	const centerGuideStateRef = useRef({ vertical: false, horizontal: false });
	const centerGuidePendingRef = useRef({ vertical: false, horizontal: false });
	const centerGuideRafRef = useRef(null);
	const hideFrameContextMenuRef = useRef(() => {});
	const copyFrameToClipboardRef = useRef(() => false);
	const pasteFrameFromClipboardRef = useRef(() => null);
	const hideCenterGuidesImmediateRef = useRef(() => {});
	const getActivePrintifySafeBoundsRef = useRef(() => null);
	const commitElementDragPositionRef = useRef(() => {});
	const clearPendingDragPositionRafRef = useRef(() => {});
	const onRotationEndRef = useRef(() => {});

	function queueCenterGuides(nextGuides) {
		const next = {
			vertical: Boolean(nextGuides?.vertical),
			horizontal: Boolean(nextGuides?.horizontal),
		};
		centerGuidePendingRef.current = next;
		if (centerGuideRafRef.current) return;
		centerGuideRafRef.current = window.requestAnimationFrame(() => {
			centerGuideRafRef.current = null;
			const pending = centerGuidePendingRef.current;
			const current = centerGuideStateRef.current;
			if (
				current.vertical === pending.vertical &&
				current.horizontal === pending.horizontal
			) {
				return;
			}
			centerGuideStateRef.current = pending;
			setShowCenterGuides(pending);
		});
	}

	function hideCenterGuidesImmediate() {
		if (centerGuideRafRef.current) {
			window.cancelAnimationFrame(centerGuideRafRef.current);
			centerGuideRafRef.current = null;
		}
		centerGuidePendingRef.current = { vertical: false, horizontal: false };
		const current = centerGuideStateRef.current;
		if (!current.vertical && !current.horizontal) return;
		centerGuideStateRef.current = { vertical: false, horizontal: false };
		setShowCenterGuides({ vertical: false, horizontal: false });
	}
	hideCenterGuidesImmediateRef.current = hideCenterGuidesImmediate;

	function hideFrameContextMenu() {
		setFrameContextMenu((prev) =>
			prev.visible ? { ...prev, visible: false } : prev
		);
	}
	hideFrameContextMenuRef.current = hideFrameContextMenu;

	function openFrameContextMenu(event, targetId = null) {
		if (isMobile) return;
		setFrameContextMenu({
			visible: true,
			x: event.clientX,
			y: event.clientY,
			targetId,
		});
	}

	function getActivePrintifySafeBounds() {
		if (!printAreaRef.current) return null;
		const rect = printAreaRef.current.getBoundingClientRect();
		return resolvePrintifySafeBounds(
			rect.width,
			rect.height,
			printifySafeInsetPercent
		);
	}
	getActivePrintifySafeBoundsRef.current = getActivePrintifySafeBounds;

	function clearPendingDragPositionRaf() {
		if (dragPositionRafRef.current) {
			window.cancelAnimationFrame(dragPositionRafRef.current);
			dragPositionRafRef.current = null;
		}
		dragPositionPendingRef.current = null;
	}
	clearPendingDragPositionRafRef.current = clearPendingDragPositionRaf;

	function commitElementDragPosition(elementId, x, y) {
		if (!Number.isFinite(x) || !Number.isFinite(y) || !elementId) return;
		setElements((prev) =>
			prev.map((item) => {
				if (item.id !== elementId) return item;
				const safeBounds = getActivePrintifySafeBounds();
				if (!safeBounds) {
					if (item.x === x && item.y === y) return item;
					return { ...item, x, y };
				}
				const clamped = clampElementPositionWithinBounds(
					x,
					y,
					item.width,
					item.height,
					safeBounds
				);
				if (item.x === clamped.x && item.y === clamped.y) return item;
				return { ...item, x: clamped.x, y: clamped.y };
			})
		);
	}
	commitElementDragPositionRef.current = commitElementDragPosition;

	function queueDragPositionCommit(elementId, x, y) {
		dragPositionPendingRef.current = { elementId, x, y };
		dragLastPositionRef.current = { elementId, x, y };
		if (dragPositionRafRef.current) return;
		dragPositionRafRef.current = window.requestAnimationFrame(() => {
			dragPositionRafRef.current = null;
			const pending = dragPositionPendingRef.current;
			dragPositionPendingRef.current = null;
			if (!pending) return;
			commitElementDragPosition(pending.elementId, pending.x, pending.y);
		});
	}

	function captureCurrentDragGeometry() {
		if (!printAreaRef.current) {
			dragGeometryRef.current = {
				ready: false,
				containerCenterX: 0,
				containerCenterY: 0,
				safeBounds: null,
			};
			return;
		}
		const printAreaBounds = printAreaRef.current.getBoundingClientRect();
		const overlayBounds =
			designOverlayRef.current?.getBoundingClientRect() || printAreaBounds;
		const printAreaOffsetX = printAreaBounds.left - overlayBounds.left;
		const printAreaOffsetY = printAreaBounds.top - overlayBounds.top;
		const containerCenterX = clampNumber(
			overlayBounds.width / 2 - printAreaOffsetX,
			0,
			printAreaBounds.width
		);
		const containerCenterY = clampNumber(
			overlayBounds.height / 2 - printAreaOffsetY,
			0,
			printAreaBounds.height
		);
		const safeBounds = resolvePrintifySafeBounds(
			printAreaBounds.width,
			printAreaBounds.height,
			printifySafeInsetPercent
		);
		dragGeometryRef.current = {
			ready: true,
			containerCenterX,
			containerCenterY,
			safeBounds,
		};
	}

	function copyFrameToClipboard(frame, { notify = true } = {}) {
		if (!frame) return false;
		copiedElementRef.current = JSON.parse(JSON.stringify(frame));
		pasteCountRef.current = 0;
		if (notify) message.success("Frame copied.");
		return true;
	}
	copyFrameToClipboardRef.current = copyFrameToClipboard;

	function pasteFrameFromClipboard({
		anchorClientX = null,
		anchorClientY = null,
		notify = true,
	} = {}) {
		const source = copiedElementRef.current;
		if (!source) {
			if (notify) message.warning("Copy a frame first.");
			return null;
		}

		const width = Math.max(24, Number(source.width) || 160);
		const height = Math.max(24, Number(source.height) || 90);
		const offset = 16 + Math.min(5, pasteCountRef.current) * 8;
		let nextX = Number(source.x) + offset;
		let nextY = Number(source.y) + offset;

		if (printAreaRef.current) {
			const rect = printAreaRef.current.getBoundingClientRect();
			if (
				Number.isFinite(anchorClientX) &&
				Number.isFinite(anchorClientY)
			) {
				nextX = anchorClientX - rect.left - width / 2;
				nextY = anchorClientY - rect.top - height / 2;
			}
			const safeBounds = resolvePrintifySafeBounds(
				rect.width,
				rect.height,
				printifySafeInsetPercent
			);
			const clampedPoint = clampElementPositionWithinBounds(
				nextX,
				nextY,
				width,
				height,
				safeBounds
			);
			nextX = clampedPoint.x;
			nextY = clampedPoint.y;
		}

		const newElementId = Date.now() + Math.floor(Math.random() * 1000);
		const cloned = {
			...source,
			id: newElementId,
			x: nextX,
			y: nextY,
			width,
			height,
			wasReset: false,
			isAutoGenerated: false,
		};
		delete cloned.autoKind;

		setElements((prev) => [...prev, cloned]);
		setSelectedElementId(newElementId);
		pasteCountRef.current += 1;
		if (notify) message.success("Frame pasted.");
		return newElementId;
	}
	pasteFrameFromClipboardRef.current = pasteFrameFromClipboard;

	function handleElementContextMenu(event, frame) {
		event.preventDefault();
		event.stopPropagation();
		if (!frame?.id) return;
		setSelectedElementId(frame.id);
		openFrameContextMenu(event, frame.id);
	}

	function handlePrintAreaContextMenu(event) {
		event.preventDefault();
		openFrameContextMenu(event, selectedElementId || null);
	}

	function handleContextMenuCopy() {
		const frameId = frameContextMenu.targetId || selectedElementId;
		const target = elements.find((item) => item.id === frameId);
		if (!target) {
			message.warning("Select a frame to copy.");
			hideFrameContextMenu();
			return;
		}
		copyFrameToClipboard(target);
		hideFrameContextMenu();
	}

	function handleContextMenuPaste() {
		pasteFrameFromClipboard({
			anchorClientX: frameContextMenu.x,
			anchorClientY: frameContextMenu.y,
		});
		hideFrameContextMenu();
	}

	function handleMobileDuplicateFrame() {
		if (!isMobile) return;
		const selected = elements.find((item) => item.id === selectedElementId);
		if (!selected) {
			message.warning("Select a frame first.");
			return;
		}
		copyFrameToClipboard(selected, { notify: false });
		pasteFrameFromClipboard({ notify: false });
		message.success("Frame duplicated.");
	}

	useEffect(() => {
		if (!frameContextMenu.visible) return undefined;
		const hideOnOutsidePointer = (event) => {
			if (frameContextMenuRef.current?.contains(event.target)) return;
			hideFrameContextMenuRef.current();
		};
		const hideOnEscape = (event) => {
			if (event.key === "Escape") hideFrameContextMenuRef.current();
		};
		const hideOnViewportChange = () => hideFrameContextMenuRef.current();

		document.addEventListener("mousedown", hideOnOutsidePointer);
		document.addEventListener("touchstart", hideOnOutsidePointer, {
			passive: true,
		});
		window.addEventListener("resize", hideOnViewportChange);
		window.addEventListener("scroll", hideOnViewportChange, true);
		window.addEventListener("keydown", hideOnEscape);

		return () => {
			document.removeEventListener("mousedown", hideOnOutsidePointer);
			document.removeEventListener("touchstart", hideOnOutsidePointer);
			window.removeEventListener("resize", hideOnViewportChange);
			window.removeEventListener("scroll", hideOnViewportChange, true);
			window.removeEventListener("keydown", hideOnEscape);
		};
	}, [frameContextMenu.visible]);

	useEffect(() => {
		const safeBounds = getActivePrintifySafeBoundsRef.current();
		if (!safeBounds) return;
		setElements((prev) => {
			let changed = false;
			const next = prev.map((item) => {
				const clamped = clampElementRectWithinBounds(
					{
						x: item.x,
						y: item.y,
						width: item.width,
						height: item.height,
					},
					safeBounds
				);
				if (
					clamped.x === item.x &&
					clamped.y === item.y &&
					clamped.width === item.width &&
					clamped.height === item.height
				) {
					return item;
				}
				changed = true;
				return {
					...item,
					x: clamped.x,
					y: clamped.y,
					width: clamped.width,
					height: clamped.height,
				};
			});
			return changed ? next : prev;
		});
	}, [printifySafeInsetPercent, printAreaFrame, product?._id]);

	function handleRndDrag(e, data, elId) {
		const theElement = elements.find((x) => x.id === elId);
		if (!theElement) return;
		if (!dragGeometryRef.current.ready) {
			captureCurrentDragGeometry();
		}
		const geometry = dragGeometryRef.current;
		const safeBounds = geometry.safeBounds;
		if (!safeBounds) return;
		const clampedPoint = clampElementPositionWithinBounds(
			data.x,
			data.y,
			theElement.width,
			theElement.height,
			safeBounds
		);

		const elementCenterX = clampedPoint.x + theElement.width / 2;
		const elementCenterY = clampedPoint.y + theElement.height / 2;
		const isCenteredVertically =
			Math.abs(elementCenterX - geometry.containerCenterX) < 6;
		const isCenteredHorizontally =
			Math.abs(elementCenterY - geometry.containerCenterY) < 6;
		queueCenterGuides({
			vertical: isCenteredVertically,
			horizontal: isCenteredHorizontally,
		});
		queueDragPositionCommit(elId, clampedPoint.x, clampedPoint.y);
	}

	function handleRndDragStop(e, data, elId) {
		dragSessionRef.current = false;
		dragGeometryRef.current.ready = false;
		hideCenterGuidesImmediate();
		clearPendingDragPositionRaf();
		commitElementDragPosition(elId, data.x, data.y);
		dragLastPositionRef.current = { elementId: null, x: null, y: null };
	}

	function handleRndResizeStop(e, direction, ref, delta, position, elId) {
		const newWidth = parseInt(ref.style.width, 10);
		const newHeight = parseInt(ref.style.height, 10);
		setElements((prev) =>
			prev.map((item) =>
				item.id === elId
					? (() => {
							const safeBounds = getActivePrintifySafeBounds();
							if (!safeBounds) {
								return {
									...item,
									x: position.x,
									y: position.y,
									width: newWidth,
									height: newHeight,
								};
							}
							const clamped = clampElementRectWithinBounds(
								{
									x: position.x,
									y: position.y,
									width: newWidth,
									height: newHeight,
								},
								safeBounds
							);
							return {
								...item,
								x: clamped.x,
								y: clamped.y,
								width: clamped.width,
								height: clamped.height,
							};
						})()
					: item
			)
		);
	}

	const DRAGGABLE_REGION_CLASS = "drag-handle";

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
	onRotationEndRef.current = onRotationEnd;

	useEffect(() => {
		const hardStopDragSession = (event) => {
			if (!dragSessionRef.current && !rotationData.current.rotatingElementId) return;
			const last = dragLastPositionRef.current;
			if (
				dragSessionRef.current &&
				last?.elementId &&
				Number.isFinite(last.x) &&
				Number.isFinite(last.y)
			) {
				clearPendingDragPositionRafRef.current();
				commitElementDragPositionRef.current(last.elementId, last.x, last.y);
			}
			dragSessionRef.current = false;
			dragGeometryRef.current.ready = false;
			dragLastPositionRef.current = { elementId: null, x: null, y: null };
			hideCenterGuidesImmediateRef.current();
			if (rotationData.current.rotatingElementId) {
				onRotationEndRef.current();
			}
			const eventType = String(event?.type || "").toLowerCase();
			const shouldForceRelease = eventType === "touchcancel" || eventType === "blur";
			if (shouldForceRelease) {
				setForceDragRelease(true);
				if (dragReleaseTimerRef.current) {
					clearTimeout(dragReleaseTimerRef.current);
				}
				dragReleaseTimerRef.current = setTimeout(() => {
					setForceDragRelease(false);
				}, 0);
			}
		};

		window.addEventListener("mouseup", hardStopDragSession, true);
		window.addEventListener("pointerup", hardStopDragSession, true);
		window.addEventListener("touchend", hardStopDragSession, true);
		window.addEventListener("touchcancel", hardStopDragSession, true);
		window.addEventListener("blur", hardStopDragSession);

		return () => {
			window.removeEventListener("mouseup", hardStopDragSession, true);
			window.removeEventListener("pointerup", hardStopDragSession, true);
			window.removeEventListener("touchend", hardStopDragSession, true);
			window.removeEventListener("touchcancel", hardStopDragSession, true);
			window.removeEventListener("blur", hardStopDragSession);
			clearPendingDragPositionRafRef.current();
			if (dragReleaseTimerRef.current) {
				clearTimeout(dragReleaseTimerRef.current);
			}
			if (centerGuideRafRef.current) {
				window.cancelAnimationFrame(centerGuideRafRef.current);
			}
		};
	}, []);

	function getPointerXY(evt) {
		if (evt.touches && evt.touches.length > 0) {
			return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
		}
		return { x: evt.clientX, y: evt.clientY };
	}

	function getVariantPrice() {
		if (!product || !product.variants) return 0;
		function numOrStr(x) {
			return typeof x === "number" ? x : parseInt(x, 10);
		}
		// gather chosen
		const colorOpt = findProductOption(product, "color");
		const sizeOpt = findProductOption(product, "size");
		const scentOpt = findProductOption(product, "scent");

		const chosenIds = [];
		if (colorOpt && selectedColor) {
			const cVal = colorOpt.values.find((v) => v.title === selectedColor);
			if (cVal) chosenIds.push(numOrStr(cVal.id));
		}
		if (sizeOpt && selectedSize) {
			const sVal = sizeOpt.values.find((v) => v.title === selectedSize);
			if (sVal) chosenIds.push(numOrStr(sVal.id));
		}
		if (scentOpt && selectedScent) {
			const scVal = scentOpt.values.find((v) => v.title === selectedScent);
			if (scVal) chosenIds.push(numOrStr(scVal.id));
		}
		const matchingVariant = product.variants.find((v) => {
			const varIds = v.options.map(numOrStr);
			return chosenIds.every((cid) => varIds.includes(cid));
		});
		if (matchingVariant && typeof matchingVariant.price === "number") {
			return parseFloat(matchingVariant.price / 100);
		}
		if (typeof product.price === "number") {
			return parseFloat(product.price);
		}
		return 0;
	}
	const displayedPrice = `$${getVariantPrice().toFixed(2)}`;

	// Filter the images based on color
	const filteredImages = useMemo(() => {
		if (!product) return [];
		const colorOpt = findProductOption(product, "color");
		if (!selectedColor || !colorOpt) {
			return product.images.slice(0, 6);
		}
		function numOrStr(x) {
			return typeof x === "number" ? x : parseInt(x, 10);
		}
		const colorVal = colorOpt.values.find((v) => v.title === selectedColor);
		if (!colorVal) return product.images.slice(0, 6);

		const matchingVars = product.variants.filter((v) => {
			const varIds = v.options.map(numOrStr);
			return varIds.includes(numOrStr(colorVal.id));
		});
		const matchingIds = matchingVars.map((mv) => mv.id);
		const filtered = product.images.filter((img) =>
			img.variant_ids.some((id) => matchingIds.includes(id))
		);
		return filtered.length ? filtered.slice(0, 6) : product.images.slice(0, 6);
	}, [product, selectedColor]);

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

	// Keep order updated
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

	// Global click => deselect
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

	const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
	const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
	const [isPreviewLoading, setIsPreviewLoading] = useState(false);
	const [isPreviewButtonDisabled, setIsPreviewButtonDisabled] = useState(false);
	const [previewImages, setPreviewImages] = useState([]);
	const [previewProgress, setPreviewProgress] = useState(0);
	const [previewStatusText, setPreviewStatusText] = useState(
		"Preparing your preview..."
	);
	const [activePreviewSession, setActivePreviewSession] = useState(null);
	const [isPreviewLinkedToCart, setIsPreviewLinkedToCart] = useState(false);

	const cleanupActivePreviewSession = async (sessionOverride = null) => {
		const session = sessionOverride || activePreviewSession;
		if (!session?.previewProductId) return;
		try {
			await cleanupPreviewCustomDesign(
				session.previewProductId,
				session.shopId || null
			);
		} catch (error) {
			console.warn("Failed to cleanup preview product session:", error);
		}
	};

	const handleClosePreviewModal = async ({ keepForCart = false } = {}) => {
		setIsPreviewModalVisible(false);
		setPreviewImages([]);
		setPreviewProgress(0);
		setPreviewStatusText("Preparing your preview...");

		const shouldCleanup =
			!keepForCart && !isPreviewLinkedToCart && !!activePreviewSession?.previewProductId;
		const sessionToCleanup = activePreviewSession;

		setActivePreviewSession(null);
		setIsPreviewLinkedToCart(false);

		if (shouldCleanup) {
			await cleanupActivePreviewSession(sessionToCleanup);
		}
	};

	const handlePreviewModalAddToCart = async () => {
		const added = await handleAddToCart();
		if (added) {
			await handleClosePreviewModal({ keepForCart: true });
		}
	};

	useEffect(() => {
		return () => {
			if (activePreviewSession?.previewProductId && !isPreviewLinkedToCart) {
				cleanupPreviewCustomDesign(
					activePreviewSession.previewProductId,
					activePreviewSession.shopId || null
				).catch((error) => {
					console.warn("Unmount cleanup for preview product failed:", error);
				});
			}
		};
	}, [activePreviewSession, isPreviewLinkedToCart]);

	/**
	 * 6) ADD TO CART => SCREENSHOT
	 */
	/**
	 * 6) ADD TO CART => SCREENSHOT
	 */
	async function handleAddToCart() {
		/* â”€â”€ StepÂ 0: remove default placeholder text, if still present â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		setElements((prev) =>
			prev.filter(
				(el) =>
					!(el.type === "text" && el.text.trim() === "Start typing here...")
			)
		);
		// wait a tick so the DOM reflects the removal before capture
		await new Promise((res) => setTimeout(res, 50));

		/* â”€â”€ early guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		if (isAddToCartDisabled) return false;
		if (!order.variant_id) {
			message.warning("Please select required options before adding to cart.");
			return false;
		}
		setIsAddToCartDisabled(true);

		/* â”€â”€ StepÂ 1: deselect everything (so outlines arenâ€™t captured) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		const previouslySelected = selectedElementId;
		setSelectedElementId(null);
		await new Promise((res) => setTimeout(res, 50));

		/* â”€â”€ StepÂ 2: try to capture screenshots (html2canvas â†’ domâ€‘toâ€‘image) â”€â”€â”€â”€ */
		let bareUrl, finalUrl;
		try {
			const screenshotOptions = {
				scale: isMobile ? 2 : 3,
				useCORS: true,
				allowTaint: false,
				ignoreElements: (el) => el.classList?.contains("noScreenshot"),
				backgroundColor: null,
			};

			/* bare printâ€‘area only */
			const bareCaptureNode = getBareDesignCaptureNode();
			if (!bareCaptureNode) {
				throw new Error("Design capture area is not ready yet.");
			}
			await prepareCaptureNode(bareCaptureNode);
			const bareCanvas = await html2canvas(bareCaptureNode, screenshotOptions);
			const bareDataURL = await compressCanvas(bareCanvas, {
				mimeType: "image/png",
				quality: 1,
			});
			const bareUpload = await cloudinaryUpload1(
				fallbackUserId,
				fallbackToken,
				{
					image: bareDataURL,
				}
			);
			bareUrl = bareUpload.url;

			/* final overlay (base image + user elements) */
			await prepareCaptureNode(designOverlayRef.current);
			const finalCanvas = await html2canvas(
				designOverlayRef.current,
				screenshotOptions
			);
			const finalDataURL = await compressCanvas(finalCanvas, {
				mimeType: "image/jpeg",
				quality: 0.9,
			});
			const finalUpload = await cloudinaryUpload1(
				fallbackUserId,
				fallbackToken,
				{
					image: finalDataURL,
				}
			);
			finalUrl = finalUpload.url;
		} catch (errHtml) {
			console.warn("html2canvas failed, falling back â€¦", errHtml);
			try {
				const domOptions = {
					quality: 0.9,
					bgcolor: null,
					style: { transform: "scale(2)", transformOrigin: "top left" },
					filter: (node) => !node.classList?.contains("noScreenshot"),
				};

				const bareCaptureNode = getBareDesignCaptureNode();
				if (!bareCaptureNode) {
					throw new Error("Design capture area is not ready yet.");
				}
				await prepareCaptureNode(bareCaptureNode);
				const bareBlob = await domtoimage.toBlob(
					bareCaptureNode,
					domOptions
				);
				const bareCanvas = await blobToCanvas(bareBlob);
				const bareDataURL = await compressCanvas(bareCanvas, {
					mimeType: "image/png",
					quality: 1,
				});
				bareUrl = (
					await cloudinaryUpload1(fallbackUserId, fallbackToken, {
						image: bareDataURL,
					})
				).url;

				await prepareCaptureNode(designOverlayRef.current);
				const finalBlob = await domtoimage.toBlob(
					designOverlayRef.current,
					domOptions
				);
				const finalCanvas = await blobToCanvas(finalBlob);
				const finalDataURL = await compressCanvas(finalCanvas, {
					mimeType: "image/jpeg",
					quality: 0.9,
				});
				finalUrl = (
					await cloudinaryUpload1(fallbackUserId, fallbackToken, {
						image: finalDataURL,
					})
				).url;
			} catch (errDom) {
				console.error("All screenshot attempts failed.", errDom);
				message.error(
					"Screenshot attempts failed. Please refresh the page or try another device."
				);
				setSelectedElementId(previouslySelected);
				setIsAddToCartDisabled(false);
				return false;
			}
		}

		/* â”€â”€ guard: both URLs must exist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		if (!bareUrl || !finalUrl) {
			message.error(
				"Screenshot attempts failed. Please refresh the page or try another device."
			);
			setSelectedElementId(previouslySelected);
			setIsAddToCartDisabled(false);
			return false;
		}

		/* â”€â”€ StepÂ 3: rebuild variantâ€‘price info, assemble customDesign payload â”€â”€ */
		// helper to coerce ids
		const numOrStr = (v) => (typeof v === "number" ? v : parseInt(v, 10));

		const colorOpt = findProductOption(product, "color");
		const sizeOpt = findProductOption(product, "size");
		const scentOpt = findProductOption(product, "scent");

		const chosenIds = [];
		if (colorOpt && selectedColor) {
			const cVal = colorOpt.values.find((v) => v.title === selectedColor);
			if (cVal) chosenIds.push(numOrStr(cVal.id));
		}
		if (sizeOpt && selectedSize) {
			const sVal = sizeOpt.values.find((v) => v.title === selectedSize);
			if (sVal) chosenIds.push(numOrStr(sVal.id));
		}
		if (scentOpt && selectedScent) {
			const scVal = scentOpt.values.find((v) => v.title === selectedScent);
			if (scVal) chosenIds.push(numOrStr(scVal.id));
		}

		const matchingVariant = product.variants.find((v) =>
			chosenIds.every((id) => v.options.map(numOrStr).includes(id))
		);

		/* price & variant image */
		let finalPrice = product.price || 0;
		let finalPriceAfterDiscount = product.priceAfterDiscount || finalPrice;
		let variantImage = "";
		if (matchingVariant) {
			finalPrice = matchingVariant.price / 100;
			finalPriceAfterDiscount = finalPrice;
			const matchImg = product.images.find((img) =>
				img.variant_ids.includes(matchingVariant.id)
			);
			if (matchImg) variantImage = matchImg.src;
		}

		const customDesign = {
			bareScreenshotUrl: bareUrl,
			finalScreenshotUrl: finalUrl,
			originalPrintifyImageURL: variantImage,
			size: selectedSize,
			color: selectedColor,
			scent: selectedScent,
			printArea: "front",
			PrintifyProductId: product.printifyProductDetails?.id || null,
			previewProductId: activePreviewSession?.previewProductId || null,
			previewShopId:
				activePreviewSession?.shopId ||
				product.printifyProductDetails?.shop_id ||
				null,
			variants: {
				color: colorOpt
					? colorOpt.values.find((c) => c.title === selectedColor)
					: null,
				size: sizeOpt
					? sizeOpt.values.find((s) => s.title === selectedSize)
					: null,
				scent: scentOpt
					? scentOpt.values.find((s) => s.title === selectedScent)
					: null,
			},
		};

		const chosenProductAttributes = {
			SubSKU: String(Date.now()),
			color: selectedColor,
			size: selectedSize,
			scent: selectedScent,
			quantity: 999,
			productImages: [],
			price: finalPrice,
			priceAfterDiscount: finalPriceAfterDiscount,
		};

		/* â”€â”€ StepÂ 4: push to cart & emit analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		addToCart(
			product._id,
			selectedColor,
			1,
			product,
			chosenProductAttributes,
			customDesign
		);

		try {
			if (ReactGA?.event) {
				ReactGA.event({
					category: "Add To The Cart Custom Products",
					action: "User Added Product From The Custom Products",
					label: `User added ${product.productName} to the cart`,
				});
				const eventId = `AddToCart-print-on-demand-${product._id}-${Date.now()}`;
				ReactPixel.track("AddToCart", {
					content_name: product.title || product.productName,
					content_ids: [product._id],
					content_type: "product",
					currency: "USD",
					value: finalPriceAfterDiscount,
					contents: [{ id: product._id, quantity: 1 }],
					eventID: eventId,
				});
				await axios.post(
					`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
					{
						eventName: "AddToCart",
						eventId,
						email: user?.email || null,
						phone: user?.phone || null,
						currency: "USD",
						value: finalPriceAfterDiscount,
						contentIds: [product._id],
						userAgent: window.navigator.userAgent,
					}
				);
			}
		} catch (analyticsErr) {
			console.error("Analytics error", analyticsErr);
		}

		openSidebar2();
		message.success("Added to cart with custom design!");
		if (activePreviewSession?.previewProductId) {
			setIsPreviewLinkedToCart(true);
		}

		/* â”€â”€ finally: restore selection & button state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		setSelectedElementId(previouslySelected);
		setIsAddToCartDisabled(false);
		return true;
	}

	async function handlePreviewDesign() {
		if (isPreviewButtonDisabled || isPreviewLoading) return;
		if (!order.variant_id) {
			message.warning("Please select required options before previewing.");
			return;
		}

		let progressTicker = null;
		const stopProgressTicker = () => {
			if (progressTicker) {
				clearInterval(progressTicker);
				progressTicker = null;
			}
		};
		const bumpProgress = (value) => {
			setPreviewProgress((prev) => Math.max(prev, Math.min(100, value)));
		};

		const previouslySelected = selectedElementId;

		try {
			if (activePreviewSession?.previewProductId && !isPreviewLinkedToCart) {
				await cleanupActivePreviewSession(activePreviewSession);
			}
			setActivePreviewSession(null);
			setIsPreviewLinkedToCart(false);

			setIsPreviewButtonDisabled(true);
			setIsPreviewLoading(true);
			setPreviewImages([]);
			setPreviewStatusText("Preparing your design...");
			setPreviewProgress(8);

			progressTicker = setInterval(() => {
				setPreviewProgress((prev) => (prev < 92 ? prev + 1 : prev));
			}, 180);

			setSelectedElementId(null);
			await new Promise((res) => setTimeout(res, 50));

			let bareUrl;
			try {
				const screenshotOptions = {
					scale: isMobile ? 1.5 : 2,
					useCORS: true,
					allowTaint: false,
					ignoreElements: (el) => el.classList?.contains("noScreenshot"),
					backgroundColor: null,
				};
				const previewNode = getBareDesignCaptureNode();
				if (!previewNode) {
					throw new Error("Preview capture area is not ready yet.");
				}

				setPreviewStatusText("Capturing design area...");
				bumpProgress(20);

				await prepareCaptureNode(previewNode);
				const bareCanvas = await html2canvas(previewNode, screenshotOptions);
				const bareDataURL = await compressCanvas(bareCanvas, {
					mimeType: "image/png",
					quality: 1,
				});

				setPreviewStatusText("Uploading design for preview...");
				bumpProgress(42);
				bareUrl = (
					await cloudinaryUpload1(fallbackUserId, fallbackToken, {
						image: bareDataURL,
					})
				).url;
			} catch (htmlCaptureError) {
				console.warn("html2canvas preview fallback ...", htmlCaptureError);
				const domOptions = {
					quality: 1,
					bgcolor: null,
					style: { transform: "scale(1.5)", transformOrigin: "top left" },
					filter: (node) => !node.classList?.contains("noScreenshot"),
				};
				const previewNode = getBareDesignCaptureNode();
				if (!previewNode) {
					throw new Error("Preview capture area is not ready yet.");
				}
				await prepareCaptureNode(previewNode);
				const bareBlob = await domtoimage.toBlob(previewNode, domOptions);
				const bareCanvas = await blobToCanvas(bareBlob);
				const bareDataURL = await compressCanvas(bareCanvas, {
					mimeType: "image/png",
					quality: 1,
				});

				setPreviewStatusText("Uploading design for preview...");
				bumpProgress(42);
				bareUrl = (
					await cloudinaryUpload1(fallbackUserId, fallbackToken, {
						image: bareDataURL,
					})
				).url;
			}

			if (!bareUrl) {
				throw new Error("Could not prepare the design image for preview.");
			}

			const numOrStr = (value) =>
				typeof value === "number" ? value : parseInt(value, 10);
			const colorOpt = findProductOption(product, "color");
			const sizeOpt = findProductOption(product, "size");
			const scentOpt = findProductOption(product, "scent");

			const chosenIds = [];
			if (colorOpt && selectedColor) {
				const colorValue = colorOpt.values.find(
					(value) => value.title === selectedColor
				);
				if (colorValue) chosenIds.push(numOrStr(colorValue.id));
			}
			if (sizeOpt && selectedSize) {
				const sizeValue = sizeOpt.values.find(
					(value) => value.title === selectedSize
				);
				if (sizeValue) chosenIds.push(numOrStr(sizeValue.id));
			}
			if (scentOpt && selectedScent) {
				const scentValue = scentOpt.values.find(
					(value) => value.title === selectedScent
				);
				if (scentValue) chosenIds.push(numOrStr(scentValue.id));
			}

			const matchingVariant = product.variants.find((variant) =>
				chosenIds.every((id) => variant.options.map(numOrStr).includes(id))
			);
			const previewPayload = {
				blueprint_id: product.printifyProductDetails?.blueprint_id,
				print_provider_id: product.printifyProductDetails?.print_provider_id,
				variant_id: matchingVariant?.id || order.variant_id,
				design_image_url: bareUrl,
				bare_design_image_url: bareUrl,
				design_covers_print_area: true,
				design_is_full_print_area_capture: true,
				title: product.title || product.productName,
				print_areas: product.printifyProductDetails?.print_areas || [],
			};

			setIsPreviewModalVisible(true);
			setPreviewStatusText("Generating live mockups...");
			bumpProgress(62);
			const response = await axios.post(
				`${process.env.REACT_APP_API_URL}/preview-custom-design`,
				previewPayload
			);
			const images = Array.isArray(response?.data?.preview_images)
				? response.data.preview_images
				: [];
			const previewProductId =
				response?.data?.preview_product_id || response?.data?.product_id || null;
			const previewShopId = response?.data?.shop_id || null;

			if (!images.length) {
				throw new Error("No preview images returned.");
			}

			setPreviewStatusText("Finalizing previews...");
			bumpProgress(94);
			setPreviewImages(images.slice(0, 3));
			if (previewProductId) {
				setActivePreviewSession({
					previewProductId,
					shopId: previewShopId,
				});
			} else {
				setActivePreviewSession(null);
			}
			setIsPreviewLinkedToCart(false);
			setPreviewProgress(100);
			setPreviewStatusText("Preview ready");
		} catch (previewError) {
			console.error("Preview generation failed:", previewError);
			setPreviewStatusText("Preview failed. Please try again.");
			setPreviewProgress(0);
			message.error(
				previewError?.response?.data?.error ||
					previewError?.message ||
					"Preview request failed. Please try again."
			);
		} finally {
			stopProgressTicker();
			setSelectedElementId(previouslySelected);
			setIsPreviewButtonDisabled(false);
			setIsPreviewLoading(false);
		}
	}

	useEffect(() => {
		const isTypingTarget = (target) => {
			if (!target) return false;
			const tag = String(target.tagName || "").toLowerCase();
			if (tag === "input" || tag === "textarea" || tag === "select") return true;
			if (target.isContentEditable) return true;
			return false;
		};

		const handleCopyPasteShortcuts = (event) => {
			const withModifier = event.ctrlKey || event.metaKey;
			if (!withModifier) return;
			if (isTypingTarget(event.target)) return;

			const key = String(event.key || "").toLowerCase();
			if (key === "c") {
				const selected = elements.find((item) => item.id === selectedElementId);
				if (!selected) return;
				event.preventDefault();
				copyFrameToClipboardRef.current(selected);
				hideFrameContextMenuRef.current();
				return;
			}

			if (key === "v") {
				event.preventDefault();
				pasteFrameFromClipboardRef.current();
				hideFrameContextMenuRef.current();
			}
		};

		window.addEventListener("keydown", handleCopyPasteShortcuts);
		return () => {
			window.removeEventListener("keydown", handleCopyPasteShortcuts);
		};
	}, [elements, selectedElementId]);

	async function blobToCanvas(blob) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const url = URL.createObjectURL(blob);
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				ctx.drawImage(img, 0, 0);
				URL.revokeObjectURL(url);
				resolve(canvas);
			};
			img.onerror = (err) => {
				URL.revokeObjectURL(url);
				reject(err);
			};
			img.src = url;
		});
	}

	async function waitForImagesReady(rootNode) {
		if (!rootNode || typeof rootNode.querySelectorAll !== "function") return;
		const imageNodes = Array.from(rootNode.querySelectorAll("img"));
		if (!imageNodes.length) return;

		await Promise.all(
			imageNodes.map(
				(img) =>
					new Promise((resolve) => {
						if (img.complete && (img.naturalWidth || 0) > 0) {
							resolve();
							return;
						}
						let settled = false;
						const finish = () => {
							if (settled) return;
							settled = true;
							img.removeEventListener("load", finish);
							img.removeEventListener("error", finish);
							resolve();
						};
						img.addEventListener("load", finish);
						img.addEventListener("error", finish);
						setTimeout(finish, 2500);
					}),
			),
		);
	}

	async function waitForFontsReady() {
		if (typeof document === "undefined" || !document.fonts?.ready) return;
		try {
			await document.fonts.ready;
		} catch {}
	}

	async function waitForNextPaint(frames = 2) {
		const totalFrames = Math.max(1, Number(frames) || 1);
		for (let index = 0; index < totalFrames; index += 1) {
			await new Promise((resolve) => {
				window.requestAnimationFrame(() => resolve());
			});
		}
	}

	function getBareDesignCaptureNode() {
		return printAreaRef.current || barePrintAreaRef.current || bareDesignRef.current;
	}

	async function prepareCaptureNode(node) {
		if (!node) return;
		await waitForFontsReady();
		await waitForImagesReady(node);
		await waitForNextPaint(2);
	}

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

	useEffect(() => {
		if (selectedElementId) {
			const el = elements.find((e) => e.id === selectedElementId);
			if (el && el.type === "text") {
				setShowTooltipForText(selectedElementId);
				const timer = setTimeout(() => setShowTooltipForText(null), 5000);
				return () => clearTimeout(timer);
			}
		}
		setShowTooltipForText(null);
	}, [selectedElementId, elements]);

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

	const seoSlug = toPodSlug(product.title || product.productName);
	const canonicalVariantSearch = buildCanonicalVariantSearch({
		occasion: selectedOccasion,
		color: selectedColor,
		size: selectedSize,
		scent: selectedScent,
	});
	const canonicalUrl = `https://serenejannat.com/custom-gifts/${seoSlug}/${productId}${
		canonicalVariantSearch ? `?${canonicalVariantSearch}` : ""
	}`;
	const personalizationLine = buildGiftMessage(selectedOccasion, selectedGiftName);
	const metaVariantLabel = [selectedOccasion, selectedColor, selectedSize, selectedScent]
		.filter(Boolean)
		.join(" / ");
	const metaTitle = metaVariantLabel
		? `${product.title || product.productName} | ${metaVariantLabel} | Serene Jannat`
		: `${product.title || product.productName} | Serene Jannat`;
	const rawMetaDescription =
		product.printifyProductDetails?.description ||
		product.description ||
		"Customize this product with your own designs!";
	const normalizedMetaDescription = stripHtmlTags(rawMetaDescription)
		.replace(/\s+/g, " ")
		.trim();
	const metaDescriptionBase = `${normalizedMetaDescription} Personalized for ${selectedOccasion}. ${personalizationLine} Customers can further customize color, size, scent, and artwork on the product page.`;
	const metaDescription =
		metaDescriptionBase.length > 155
			? `${metaDescriptionBase.slice(0, 152).trim()}...`
			: metaDescriptionBase;
	const metaKeywords = [
		"Print On Demand",
		"Custom Gift",
		selectedOccasion,
		`${selectedOccasion} gifts`,
		selectedColor,
		selectedSize,
		selectedScent,
		"Personalized Gifts USA",
	]
		.filter(Boolean)
		.join(", ");
	const metaImage =
		filteredImages?.[0]?.src ||
		product.images?.[0]?.src ||
		product.thumbnailImage?.[0]?.images?.[0]?.url ||
		"https://serenejannat.com/logo192.png";
	const schemaPrice = Number(String(displayedPrice || "").replace(/[^0-9.]/g, "")) || 0;

	// color/size/scent option objects:
		const colorOpt = findProductOption(product, "color");
		const sizeOpt = findProductOption(product, "size");
		const scentOpt = findProductOption(product, "scent");

	return (
		<CustomizeWrapper>
			<Helmet>
				<title>{metaTitle}</title>
				<meta name='description' content={metaDescription} />
				<meta name='keywords' content={metaKeywords} />
				<link rel='canonical' href={canonicalUrl} />
				<meta property='og:title' content={metaTitle} />
				<meta property='og:description' content={metaDescription} />
				<meta property='og:image' content={metaImage} />
				<meta property='og:url' content={canonicalUrl} />
				<meta property='og:type' content='product' />
				<meta name='twitter:card' content='summary_large_image' />
				<meta name='twitter:title' content={metaTitle} />
				<meta name='twitter:description' content={metaDescription} />
				<meta name='twitter:image' content={metaImage} />
				<meta name='twitter:url' content={canonicalUrl} />
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "Product",
							name: product.title || product.productName,
							description: metaDescription,
							image: [metaImage],
							brand: {
								"@type": "Brand",
								name: "Serene Jannat",
							},
							offers: {
								"@type": "Offer",
								priceCurrency: "USD",
								price: schemaPrice.toFixed(2),
								availability: "https://schema.org/InStock",
								url: canonicalUrl,
							},
							additionalProperty: [
								{
									"@type": "PropertyValue",
									name: "Occasion",
									value: selectedOccasion,
								},
								selectedColor
									? {
											"@type": "PropertyValue",
											name: "Color",
											value: selectedColor,
										}
									: null,
								selectedSize
									? {
											"@type": "PropertyValue",
											name: "Size",
											value: selectedSize,
										}
									: null,
								selectedScent
									? {
											"@type": "PropertyValue",
											name: "Scent",
											value: selectedScent,
										}
									: null,
								{
									"@type": "PropertyValue",
									name: "Personalization",
									value: personalizationLine,
								},
								{
									"@type": "PropertyValue",
									name: "Customization",
									value:
										"Shoppers can further customize the final product on the product page.",
								},
							].filter(Boolean),
						}),
					}}
				/>
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "Organization",
							url: "https://serenejannat.com",
							name: "Serene Jannat",
							logo: "https://serenejannat.com/logo192.png",
							sameAs: [
								"https://www.facebook.com/profile.php?id=61575325586166",
							],
						}),
					}}
				/>
			</Helmet>

			{/*
				Child Animation/Tutorial is intentionally disabled for now.
				Keep this block commented for easy re-enable later.
			*/}
			{/*
			<AnimationPODWalkThroughWrapper>
				<AnimationPODWalkThrough
					userAddedText={elements.some(
						(el) =>
							el.type === "text" &&
							el.text.trim() !== "" &&
							el.text !== "Start typing here..."
					)}
					userAddedImage={!!elements.find((el) => el.type === "image")}
					userAddedToCart={didUserAddToCart}
					isSomethingSelected={!!selectedElementId}
					userJustDoubleClickedCanvas={userJustDoubleClickedCanvas}
					userJustSingleClickedText={userJustSingleClickedText}
					hasMultipleSizeOrColor={hasMultipleSizeOrColor}
					onUserAddToCart={handleAddToCart}
					onUserUploadPhoto={() => {
						hiddenGalleryInputRef.current?.click();
					}}
					onHandleColorChange={setSelectedColor}
					onHandleSizeChange={setSelectedSize}
					onHandleScentChange={setSelectedScent}
					colorOptions={colorOpt?.values.map((v) => v.title) || []}
					sizeOptions={sizeOpt?.values.map((v) => v.title) || []}
					scentOptions={scentOpt?.values.map((v) => v.title) || []}
					selectedColor={selectedColor}
					selectedSize={selectedSize}
					selectedScent={selectedScent}
					variantExistsForColor={variantExistsForColor}
					variantExistsForSize={variantExistsForOption}
					variantExistsForScent={variantExistsForScent}
				/>
			</AnimationPODWalkThroughWrapper>
			*/}

			<Row gutter={[18, 20]}>
				<Col xs={24} md={12}>
					<StyledSlider {...sliderSettings}>
						{filteredImages.map((image, idx) => {
							if (idx > 0) {
								return (
									<SlideImageWrapper key={image.src}>
										<img src={image.src} alt={`${product.title}-${idx}`} />
									</SlideImageWrapper>
								);
							}
							// First slide => customization
							return (
								<div key={image.src}>
									{isMobile && (
										<MobileToolbarWrapper
											className='noScreenshot'
											style={{
												opacity: showMobileButtons ? 1 : 0,
												transition: "opacity 0.8s ease-in",
											}}
										>
											<MobileLeftCorner>
												{colorOpt?.values?.length > 0 && (
													<Select
														style={{ width: "100%", marginBottom: 8 }}
														placeholder='Color'
														value={selectedColor}
														onChange={(val) => {
															setSelectedColor(val);
															setHasChangedSizeOrColor(true);
														}}
													>
														{colorOpt.values.map((cObj) => (
															<Option key={cObj.title} value={cObj.title}>
																{cObj.title}
															</Option>
														))}
													</Select>
												)}

												{sizeOpt?.values?.length > 0 && (
													<Select
														style={{ width: "100%", marginBottom: 8 }}
														placeholder='Size'
														value={selectedSize}
														onChange={(val) => {
															setSelectedSize(val);
															setHasChangedSizeOrColor(true);
														}}
													>
														{sizeOpt.values.map((sizeObj) => {
															const isDisabled = !variantExistsForOption(
																sizeObj,
																selectedColor,
																selectedScent
															);
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
													</Select>
												)}

												{/* SCENT if present */}
												{scentOpt?.values?.length > 0 && (
													<Select
														style={{ width: "100%" }}
														placeholder='Scent'
														value={selectedScent}
														onChange={(val) => {
															setSelectedScent(val);
															setHasChangedSizeOrColor(true);
														}}
													>
														{scentOpt.values.map((scObj) => {
															const isDisabled = !variantExistsForScent(
																scObj,
																selectedColor,
																selectedSize
															);
															return (
																<Option
																	key={scObj.title}
																	value={scObj.title}
																	disabled={isDisabled}
																	style={{
																		color: isDisabled ? "#aaa" : "inherit",
																	}}
																>
																	{scObj.title}
																</Option>
															);
														})}
													</Select>
												)}
											</MobileLeftCorner>

											<FloatingActions>
												<Button
													type='primary'
													icon={<ShoppingCartOutlined />}
													onClick={handleAddToCart}
													disabled={isAddToCartDisabled}
												>
													{isAddToCartDisabled
														? "Processing..."
														: "Add to Cart"}
												</Button>
												<Button
													type='default'
													icon={<EyeOutlined />}
													onClick={handlePreviewDesign}
													disabled={isPreviewButtonDisabled || isPreviewLoading}
												>
													{isPreviewLoading
														? "Preparing Preview..."
														: "Preview Design"}
												</Button>
												<Button
													icon={<EditOutlined />}
													onClick={() => {
														setMobileTextInput("");
														setTextModalVisible(true);
														try {
															if (
																ReactGA &&
																typeof ReactGA.event === "function"
															) {
																ReactGA.event({
																	category: "User Added Text In Custom Design",
																	action: "User Added Text In Custom Design",
																	label: "User Added Text In Custom Design",
																});
																ReactPixel.track("CustomizeProduct", {
																	content_name:
																		product.title || product.productName,
																	content_ids: [product._id],
																	content_type: "product",
																});
															}
														} catch {}
													}}
												>
													Add Text
												</Button>
												<Button
													onClick={handleMobileDuplicateFrame}
													disabled={!selectedElementId}
												>
													Duplicate
												</Button>

												<Button
													icon={<CameraOutlined />}
													onClick={() => hiddenCameraInputRef.current.click()}
												>
													Take Photo
												</Button>
												<input
													type='file'
													accept='image/*'
													capture='environment'
													ref={hiddenCameraInputRef}
													style={{ display: "none" }}
													onChange={(e) => {
														if (e.target.files?.length) {
															addImageElement(e.target.files[0]);
														}
													}}
												/>

												<Button
													icon={<CloudUploadOutlined />}
													onClick={() => {
														try {
															if (
																ReactGA &&
																typeof ReactGA.event === "function"
															) {
																ReactGA.event({
																	category:
																		"User Uploaded Image In Custom Design",
																	action:
																		"User Uploaded Image In Custom Design",
																	label: "User Uploaded Image In Custom Design",
																});
																ReactPixel.track("CustomizeProduct", {
																	content_name:
																		product.title || product.productName,
																	content_ids: [product._id],
																	content_type: "product",
																});
															}
														} catch {}
														hiddenGalleryInputRef.current.click();
													}}
												>
													Upload Image
												</Button>
												<input
													type='file'
													accept='image/*,.jpg,.jpeg,.png,.gif,.webp,.heic,.HEIC,.heif,.HEIF'
													ref={hiddenGalleryInputRef}
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

									<DesignOverlay ref={designOverlayRef}>
										<OverlayImage
											src={image.src}
											alt={`${product.title}-front`}
											crossOrigin='anonymous'
										/>
										{showCenterGuides.horizontal && (
											<HorizontalCenterIndicator />
										)}
										{(showCenterGuides.vertical ||
											showCenterGuides.horizontal) && <CenterGuideDot />}
										<PrintArea
											id='print-area'
											ref={printAreaRef}
											style={printAreaFrame}
											onDoubleClick={handleBlankAreaDoubleClick}
											onContextMenu={handlePrintAreaContextMenu}
										>
											{showCenterGuides.vertical && <CenterIndicator />}
											<DottedOverlay className='noScreenshot' />
											<PrintifyGridOverlay className='noScreenshot'>
												<PrintifySafeZone
													style={{ inset: `${printifySafeInsetPercent}%` }}
												/>
											</PrintifyGridOverlay>
											{renderDesignElements()}
										</PrintArea>
										{frameContextMenu.visible && (
											<FrameContextMenu
												ref={frameContextMenuRef}
												style={{
													top: frameContextMenu.y,
													left: frameContextMenu.x,
												}}
											>
												<FrameContextMenuItem
													type='button'
													onClick={handleContextMenuCopy}
													disabled={
														!elements.some(
															(item) =>
																item.id ===
																(frameContextMenu.targetId || selectedElementId)
														)
													}
												>
													Copy frame
												</FrameContextMenuItem>
												<FrameContextMenuItem
													type='button'
													onClick={handleContextMenuPaste}
													disabled={!copiedElementRef.current}
												>
													Paste frame
												</FrameContextMenuItem>
											</FrameContextMenu>
										)}
									</DesignOverlay>
								</div>
							);
						})}
					</StyledSlider>
				</Col>

				{/* RIGHT COLUMN */}
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

					{!isMobile && (
						<DesktopActionBar>
							<Button
								type='default'
								icon={<EyeOutlined />}
								onClick={handlePreviewDesign}
								disabled={isPreviewButtonDisabled || isPreviewLoading}
								block
							>
								{isPreviewLoading ? "Preparing Preview..." : "Preview Design"}
							</Button>
							<Button
								type='primary'
								icon={<ShoppingCartOutlined />}
								onClick={handleAddToCart}
								disabled={isAddToCartDisabled}
								block
							>
								{isAddToCartDisabled ? "Processing..." : "Add to Cart"}
							</Button>
						</DesktopActionBar>
					)}

					{!isMobile && (
						<>
							<PersonalizationPanel>
								<Title
									level={4}
									style={{ color: "var(--text-color-dark)", marginBottom: 8 }}
								>
									Gift Personalization
								</Title>
								<Row gutter={12}>
									<Col span={12}>
										<Select
											style={{ width: "100%" }}
											value={selectedOccasion}
											onChange={(value) =>
												syncPersonalization(value, selectedGiftName)
											}
										>
											{POD_OCCASION_OPTIONS.map((item) => (
												<Option key={item.value} value={item.value}>
													<span>
														{item.icon} {item.value}
													</span>
												</Option>
											))}
										</Select>
									</Col>
									<Col span={12}>
										<Input
											value={selectedGiftName}
											onChange={(e) =>
												syncPersonalization(selectedOccasion, e.target.value)
											}
											placeholder='Name (optional)'
											maxLength={40}
										/>
									</Col>
								</Row>
								<PresetPreviewBox>
								<PresetPreviewText
										style={{
											color: effectiveOccasionStylePreset.textColor,
											backgroundColor: effectiveOccasionStylePreset.backgroundColor,
											backgroundImage: `linear-gradient(140deg, ${
												effectiveOccasionStylePreset.messageGradientStart ||
												effectiveOccasionStylePreset.backgroundColor
											} 0%, ${
												effectiveOccasionStylePreset.messageGradientEnd ||
												effectiveOccasionStylePreset.backgroundColor
											} 100%)`,
											fontFamily: effectiveOccasionStylePreset.fontFamily,
											fontSize: `${Math.max(16, effectiveOccasionStylePreset.fontSize - 6)}px`,
											fontWeight: effectiveOccasionStylePreset.fontWeight,
											fontStyle: effectiveOccasionStylePreset.fontStyle,
											letterSpacing:
												effectiveOccasionStylePreset.letterSpacing || "0.08px",
											textShadow:
												effectiveOccasionStylePreset.textShadow ||
												"0 1px 2px rgba(16, 33, 24, 0.16)",
											borderRadius: `${effectiveOccasionStylePreset.borderRadius}px`,
											border: `${clampNumber(
												Number(effectiveOccasionStylePreset.messageBorderWidth) || 2,
												1,
												4,
											)}px solid ${
												effectiveOccasionStylePreset.messageBorderColor ||
												effectiveOccasionStylePreset.accentBorderColor ||
												"rgba(31, 41, 55, 0.2)"
											}`,
											boxShadow:
												effectiveOccasionStylePreset.messageShadow ||
												"0 6px 16px rgba(16, 33, 24, 0.12)",
										}}
									>
										<PresetIconBubble
											style={{
												color: effectiveOccasionStylePreset.accentTextColor,
												backgroundColor:
													effectiveOccasionStylePreset.accentBackgroundColor,
												backgroundImage: `linear-gradient(145deg, ${
													effectiveOccasionStylePreset.accentBackgroundColor ||
													effectiveOccasionStylePreset.messageGradientStart ||
													"#ffffff"
												} 0%, ${
													effectiveOccasionStylePreset.accentBackgroundColor2 ||
													effectiveOccasionStylePreset.accentBackgroundColor ||
													"#f3f4f6"
												} 100%)`,
												borderColor: effectiveOccasionStylePreset.accentBorderColor,
												boxShadow:
													effectiveOccasionStylePreset.accentShadow ||
													"0 5px 13px rgba(16, 33, 24, 0.1)",
												textShadow:
													effectiveOccasionStylePreset.textShadow ||
													"0 1px 2px rgba(16, 33, 24, 0.16)",
											}}
										>
											{effectiveOccasionStylePreset.accentIcon ||
												selectedOccasionMeta.icon}
										</PresetIconBubble>
										<span>
											{effectiveOccasionStylePreset.ornamentLeft || ""}
											{effectiveOccasionStylePreset.ornamentLeft ? " " : ""}
											{buildGiftMessage(selectedOccasion, selectedGiftName)}
											{effectiveOccasionStylePreset.ornamentRight ? " " : ""}
											{effectiveOccasionStylePreset.ornamentRight || ""}
										</span>
									</PresetPreviewText>
								</PresetPreviewBox>
								<Switch
									checked={advancedEditMode}
									onChange={handleAdvancedModeChange}
									checkedChildren='Advanced on'
									unCheckedChildren='Simple mode'
								/>
							</PersonalizationPanel>

							<CustomizePanel className='whole-select-options'>
								<Title
									level={4}
									style={{ color: "var(--text-color-dark)", marginBottom: 8 }}
								>
									Select Options:
								</Title>
								<Row gutter={12}>
									{colorOpt?.values?.length > 0 && (
										<Col span={12}>
											<Select
												style={{ width: "100%" }}
												className='selectDesktopOrMobile'
												placeholder='Color'
												value={selectedColor}
												onChange={(val) => {
													setSelectedColor(val);
													setHasChangedSizeOrColor(true);
												}}
											>
												{colorOpt.values.map((cObj) => (
													<Option key={cObj.title} value={cObj.title}>
														{cObj.title}
													</Option>
												))}
											</Select>
										</Col>
									)}

									{sizeOpt?.values?.length > 0 && (
										<Col span={12}>
											<Select
												style={{ width: "100%" }}
												className='selectDesktopOrMobile'
												placeholder='Size'
												value={selectedSize}
												onChange={(val) => {
													setSelectedSize(val);
													setHasChangedSizeOrColor(true);
												}}
											>
												{sizeOpt.values.map((sizeObj) => {
													const isDisabled = !variantExistsForOption(
														sizeObj,
														selectedColor,
														selectedScent
													);
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
											</Select>
										</Col>
									)}
								</Row>

								{scentOpt?.values?.length > 0 && (
									<Row gutter={12} style={{ marginTop: 16 }}>
										<Col span={24}>
											<Title
												level={4}
												style={{
													color: "var(--text-color-dark)",
													marginBottom: 8,
												}}
											>
												Scent:
											</Title>
											<Select
												style={{ width: "100%" }}
												className='selectDesktopOrMobile'
												placeholder='Scent'
												value={selectedScent}
												onChange={(val) => {
													setSelectedScent(val);
													setHasChangedSizeOrColor(true);
												}}
											>
												{scentOpt.values.map((scObj) => {
													const isDisabled = !variantExistsForScent(
														scObj,
														selectedColor,
														selectedSize
													);
													return (
														<Option
															key={scObj.title}
															value={scObj.title}
															disabled={isDisabled}
															style={{ color: isDisabled ? "#aaa" : "inherit" }}
														>
															{scObj.title}
														</Option>
													);
												})}
											</Select>
										</Col>
									</Row>
								)}

								<Divider style={{ margin: "16px 0" }} />

								<Title level={4} style={{ color: "var(--text-color-dark)" }}>
									Add/Update Text
								</Title>
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
										onClick={() => addTextElement(null, true)}
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
							</CustomizePanel>
						</>
					)}

				</Col>
			</Row>

			{/* MOBILE BOTTOM PANEL */}
			{isMobile && (
				<MobileBottomPanel>
					<Divider />
					<CustomizePanel>
						<Title
							level={4}
							style={{ color: "var(--text-color-dark)", marginBottom: 8 }}
						>
							Gift Personalization
						</Title>
						<Row gutter={8}>
							<Col span={12}>
								<Select
									style={{ width: "100%" }}
									value={selectedOccasion}
									onChange={(value) =>
										syncPersonalization(value, selectedGiftName)
									}
								>
									{POD_OCCASION_OPTIONS.map((item) => (
										<Option key={item.value} value={item.value}>
											<span>
												{item.icon} {item.value}
											</span>
										</Option>
									))}
								</Select>
							</Col>
							<Col span={12}>
								<Input
									value={selectedGiftName}
									onChange={(e) =>
										syncPersonalization(selectedOccasion, e.target.value)
									}
									placeholder='Name (optional)'
									maxLength={40}
								/>
							</Col>
						</Row>
						<PresetPreviewBox>
						<PresetPreviewText
								style={{
									color: effectiveOccasionStylePreset.textColor,
									backgroundColor: effectiveOccasionStylePreset.backgroundColor,
									backgroundImage: `linear-gradient(140deg, ${
										effectiveOccasionStylePreset.messageGradientStart ||
										effectiveOccasionStylePreset.backgroundColor
									} 0%, ${
										effectiveOccasionStylePreset.messageGradientEnd ||
										effectiveOccasionStylePreset.backgroundColor
									} 100%)`,
									fontFamily: effectiveOccasionStylePreset.fontFamily,
									fontSize: `${Math.max(14, effectiveOccasionStylePreset.fontSize - 8)}px`,
									fontWeight: effectiveOccasionStylePreset.fontWeight,
									fontStyle: effectiveOccasionStylePreset.fontStyle,
									letterSpacing: effectiveOccasionStylePreset.letterSpacing || "0.08px",
									textShadow:
										effectiveOccasionStylePreset.textShadow ||
										"0 1px 2px rgba(16, 33, 24, 0.16)",
									borderRadius: `${effectiveOccasionStylePreset.borderRadius}px`,
									border: `${clampNumber(
										Number(effectiveOccasionStylePreset.messageBorderWidth) || 2,
										1,
										4,
									)}px solid ${
										effectiveOccasionStylePreset.messageBorderColor ||
										effectiveOccasionStylePreset.accentBorderColor ||
										"rgba(31, 41, 55, 0.2)"
									}`,
									boxShadow:
										effectiveOccasionStylePreset.messageShadow ||
										"0 6px 16px rgba(16, 33, 24, 0.12)",
								}}
							>
								<PresetIconBubble
									style={{
										color: effectiveOccasionStylePreset.accentTextColor,
										backgroundColor: effectiveOccasionStylePreset.accentBackgroundColor,
										backgroundImage: `linear-gradient(145deg, ${
											effectiveOccasionStylePreset.accentBackgroundColor ||
											effectiveOccasionStylePreset.messageGradientStart ||
											"#ffffff"
										} 0%, ${
											effectiveOccasionStylePreset.accentBackgroundColor2 ||
											effectiveOccasionStylePreset.accentBackgroundColor ||
											"#f3f4f6"
										} 100%)`,
										borderColor: effectiveOccasionStylePreset.accentBorderColor,
										boxShadow:
											effectiveOccasionStylePreset.accentShadow ||
											"0 5px 13px rgba(16, 33, 24, 0.1)",
										textShadow:
											effectiveOccasionStylePreset.textShadow ||
											"0 1px 2px rgba(16, 33, 24, 0.16)",
									}}
								>
									{effectiveOccasionStylePreset.accentIcon || selectedOccasionMeta.icon}
								</PresetIconBubble>
								<span>
									{effectiveOccasionStylePreset.ornamentLeft || ""}
									{effectiveOccasionStylePreset.ornamentLeft ? " " : ""}
									{buildGiftMessage(selectedOccasion, selectedGiftName)}
									{effectiveOccasionStylePreset.ornamentRight ? " " : ""}
									{effectiveOccasionStylePreset.ornamentRight || ""}
								</span>
							</PresetPreviewText>
						</PresetPreviewBox>
						<Switch
							checked={advancedEditMode}
							onChange={handleAdvancedModeChange}
							checkedChildren='Advanced'
							unCheckedChildren='Simple'
						/>
						<Divider style={{ margin: "16px 0" }} />

						<Title
							level={4}
							style={{ color: "var(--text-color-dark)", marginBottom: 8 }}
						>
							Select Options:
						</Title>
						<Row gutter={12}>
							{colorOpt?.values?.length > 0 && (
								<Col span={12}>
									<Select
										style={{ width: "100%" }}
										placeholder='Color'
										value={selectedColor}
										onChange={(val) => {
											setSelectedColor(val);
											setHasChangedSizeOrColor(true);
										}}
									>
										{colorOpt.values.map((cObj) => (
											<Option key={cObj.title} value={cObj.title}>
												{cObj.title}
											</Option>
										))}
									</Select>
								</Col>
							)}

							{sizeOpt?.values?.length > 0 && (
								<Col span={12}>
									<Select
										style={{ width: "100%" }}
										placeholder='Size'
										value={selectedSize}
										onChange={(val) => {
											setSelectedSize(val);
											setHasChangedSizeOrColor(true);
										}}
									>
										{sizeOpt.values.map((sizeObj) => {
											const isDisabled = !variantExistsForOption(
												sizeObj,
												selectedColor,
												selectedScent
											);
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
									</Select>
								</Col>
							)}
						</Row>

						{/* Scent if any */}
						{scentOpt?.values?.length > 0 && (
							<>
								<Divider style={{ margin: "16px 0" }} />
								<Title level={4} style={{ color: "var(--text-color-dark)" }}>
									Scent
								</Title>
								<Select
									style={{ width: "100%" }}
									placeholder='Scent'
									value={selectedScent}
									onChange={(val) => {
										setSelectedScent(val);
										setHasChangedSizeOrColor(true);
									}}
								>
									{scentOpt.values.map((scObj) => {
										const isDisabled = !variantExistsForScent(
											scObj,
											selectedColor,
											selectedSize
										);
										return (
											<Option
												key={scObj.title}
												value={scObj.title}
												disabled={isDisabled}
												style={{ color: isDisabled ? "#aaa" : "inherit" }}
											>
												{scObj.title}
											</Option>
										);
									})}
								</Select>
							</>
						)}

						<Divider style={{ margin: "16px 0" }} />

						<Title level={4} style={{ color: "var(--text-color-dark)" }}>
							Add/Update Text
						</Title>
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
								onClick={() => addTextElement(null, true)}
							>
								Add Text
							</Button>
						</div>

						<Divider />
						<Title level={4}>Upload Your Image</Title>
						<UploadZone {...getRootProps()}>
							<input {...getInputProps()} />
							<p>Drag &amp; drop or tap to select an image</p>
						</UploadZone>

						<Divider />
						<MobileStickyActions className='noScreenshot'>
							<Button
								type='default'
								icon={<EyeOutlined />}
								onClick={handlePreviewDesign}
								disabled={isPreviewButtonDisabled || isPreviewLoading}
								block
							>
								{isPreviewLoading ? "Preparing Preview..." : "Preview Design"}
							</Button>
							<Button
								type='primary'
								icon={<ShoppingCartOutlined />}
								onClick={handleAddToCart}
								disabled={isAddToCartDisabled}
								block
							>
								{isAddToCartDisabled ? "Processing..." : "Add to Cart"}
							</Button>
						</MobileStickyActions>
					</CustomizePanel>
				</MobileBottomPanel>
			)}

			{/* MOBILE TEXT MODAL */}
			<Modal
				title='Add Your Text'
				open={textModalVisible}
				onCancel={() => setTextModalVisible(false)}
				onOk={() => {
					addTextElement(mobileTextInput, true);
					setTextModalVisible(false);
				}}
			>
				<Input
					placeholder='Type your text here...'
					value={mobileTextInput}
					onChange={(e) => setMobileTextInput(e.target.value)}
				/>
			</Modal>

			<Modal
				title='Preview Design'
				open={isPreviewModalVisible}
				onCancel={() => {
					handleClosePreviewModal();
				}}
				footer={[
					<Button
						key='add-to-cart'
						type='primary'
						icon={<ShoppingCartOutlined />}
						onClick={handlePreviewModalAddToCart}
						disabled={isPreviewLoading || isAddToCartDisabled}
					>
						{isAddToCartDisabled ? "Processing..." : "Add to Cart"}
					</Button>,
					<Button
						key='close'
						onClick={() => {
							handleClosePreviewModal();
						}}
					>
						Close
					</Button>,
				]}
				width={920}
				destroyOnHidden
			>
				{isPreviewLoading ? (
					<PreviewLoadingWrap>
						<Spin size='large' />
						<PreviewProgressBox>
							<PreviewStatusText>{previewStatusText}</PreviewStatusText>
							<Progress
								percent={previewProgress}
								status={previewProgress >= 100 ? "success" : "active"}
								showInfo
							/>
						</PreviewProgressBox>
					</PreviewLoadingWrap>
				) : previewImages.length === 0 ? (
					<PersonalizationHint>
						No preview images were returned. Please try a different variant or
						design.
					</PersonalizationHint>
				) : (
					<PreviewImagesGrid>
						{previewImages.map((imageUrl, index) => (
							<PreviewImageCard key={`${imageUrl}-${index}`}>
								<img src={imageUrl} alt={`Design preview ${index + 1}`} />
							</PreviewImageCard>
						))}
					</PreviewImagesGrid>
				)}
			</Modal>

			{uploadingImage && (
				<UploadOverlay>
					<Spin spinning size='large' tip='Uploading image...'>
						<div style={{ minHeight: 120 }} />
					</Spin>
				</UploadOverlay>
			)}

			{/* BARE DESIGN (for screenshot) */}
			<BareDesignOverlay ref={bareDesignRef}>
				<BarePrintArea
					id='bare-print-area'
					ref={barePrintAreaRef}
					style={printAreaFrame}
				>
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
										style={buildTextElementStyle(el)}
									>
										{renderTextElementContent(el)}
									</div>
								) : (
									<img
										src={el.src}
										alt='Custom'
										crossOrigin='anonymous'
										style={{
											width: "100%",
											height: "100%",
											objectFit: "contain",
											borderRadius: clampNumber(
												Number(el.borderRadius) || 0,
												0,
												999,
											),
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
	 * Renders the draggable design elements in the main â€œprintAreaâ€
	 */
	function renderDesignElements() {
		return elements.map((el) => {
			const isSelected = el.id === selectedElementId;
			const dragEnabled =
				!forceDragRelease && (advancedEditMode || el.type === "image");
			return (
				<Rnd
					key={el.id}
					className='rnd-element'
					bounds='#print-area'
					position={{ x: el.x, y: el.y }}
					size={{ width: el.width, height: el.height }}
					enableResizing={
						advancedEditMode
							? {
									topLeft: true,
									topRight: true,
									bottomLeft: true,
									bottomRight: true,
								}
							: false
					}
					disableDragging={!dragEnabled}
					handleStyles={{
						topLeft: { width: "20px", height: "20px" },
						topRight: { width: "20px", height: "20px" },
						bottomLeft: { width: "20px", height: "20px" },
						bottomRight: { width: "20px", height: "20px" },
					}}
					onDragStart={() => {
						dragSessionRef.current = true;
						captureCurrentDragGeometry();
						if (dragEnabled) setSelectedElementId(el.id);
					}}
					onDrag={(e, data) => handleRndDrag(e, data, el.id)}
					onDragStop={(e, data) => handleRndDragStop(e, data, el.id)}
					onResizeStart={() => advancedEditMode && setSelectedElementId(el.id)}
					onResizeStop={(e, dir, ref, delta, pos) =>
						handleRndResizeStop(e, dir, ref, delta, pos, el.id)
					}
					dragHandleClassName={
						dragEnabled ? DRAGGABLE_REGION_CLASS : undefined
					}
					cancel='.rotate-handle, .text-toolbar, .image-toolbar, .text-toolbar *, .image-toolbar *'
					style={{
						border: isSelected && advancedEditMode
							? "1px dashed var(--text-color-dark)"
							: "1px dashed transparent",
						position: "absolute",
					}}
					onContextMenu={(event) => handleElementContextMenu(event, el)}
					onMouseDown={() => handleElementClick(el)}
					onTouchStart={() => handleElementClick(el)}
				>
					<div
						className={DRAGGABLE_REGION_CLASS}
						style={{
							width: "100%",
							height: "100%",
							cursor: dragEnabled ? "move" : "default",
							touchAction: "none",
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
										...buildTextElementStyle(el),
										userSelect: "none",
									}}
								>
									{renderTextElementContent(el)}
								</TextElement>
							)
						) : (
							<ImageElement
								src={el.src}
								alt='Custom'
								crossOrigin='anonymous'
								style={{
									width: "100%",
									height: "100%",
									objectFit: "contain",
									borderRadius: clampNumber(
										Number(el.borderRadius) || 0,
										0,
										999,
									),
									userSelect: "none",
								}}
							/>
						)}
					</div>

					{isSelected && advancedEditMode && (
						<RotateHandle
							className='rotate-handle'
							onMouseDown={(evt) => onRotationStart(evt, el.id)}
							onTouchStart={(evt) => onRotationStart(evt, el.id)}
							title='Rotate this element'
							style={{ touchAction: "none" }}
						>
							â†»
						</RotateHandle>
					)}

					{isSelected &&
						el.type === "text" &&
						showTooltipForText === el.id &&
						!isRotating && (
							<DoubleClickTooltip>
								{isMobile
									? "Double-tap to edit text"
									: "Double-click to edit text"}
							</DoubleClickTooltip>
						)}

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
											title='BG Color'
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
										max={999}
										value={el.borderRadius}
										onChange={(value) =>
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? {
																...item,
																borderRadius: clampNumber(
																	Number(value) || 0,
																	0,
																	999,
																),
															}
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

					{isSelected && el.type === "image" && !isRotating && (
						<ImageToolbarContainer className='image-toolbar'>
							<ImageToolbar>
								<ToolbarRowImage>
									<InputNumber
										min={0}
										max={999}
										value={el.borderRadius || 0}
										onChange={(value) => {
											const safeRadius = clampNumber(
												Number(value) || 0,
												0,
												999,
											);
											setElements((prev) =>
												prev.map((item) =>
													item.id === el.id
														? { ...item, borderRadius: safeRadius }
														: item
												)
											);
											setBorderRadius(safeRadius);
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

/**
 * ------------------------------------------------------------------------
 * STYLED COMPONENTS
 * ------------------------------------------------------------------------
 */
const CustomizeWrapper = styled.section`
	padding: 40px;
	min-height: 85vh;
	background-color: var(--background-light);

	@media (max-width: 800px) {
		padding: 16px 14px 20px !important;
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
		border-radius: 18px;
		border: 1px solid #ece0d6;
		box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
	}
`;

const PrintArea = styled.div`
	position: absolute;
	top: 20%;
	left: 20%;
	width: 60%;
	height: 75%;
	pointer-events: auto;
	z-index: 1;
`;

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

const PrintifyGridOverlay = styled.div`
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 2;
`;

const PrintifySafeZone = styled.div`
	position: absolute;
	border: 1px dashed rgba(32, 91, 63, 0.35);
	border-radius: 2px;
	background: transparent;
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
	crossorigin: "anonymous";
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
	flex-direction: column;
	gap: 12px;
	padding: 14px;
	margin: 4px 0 14px;
	background: linear-gradient(180deg, #fffaf6 0%, #ffffff 100%);
	border: 1px solid #ece0d6;
	border-radius: 16px;
	box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
`;

const MobileLeftCorner = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;

	> .ant-select {
		margin-bottom: 0 !important;
	}
`;

const FloatingActions = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
	width: 100%;

	> button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		min-height: 44px;
		margin: 0 !important;
	}

	> button:last-of-type {
		grid-column: 1 / -1;
	}

	@media (max-width: 360px) {
		grid-template-columns: 1fr;

		> button:last-of-type {
			grid-column: auto;
		}
	}
`;

const MobileBottomPanel = styled.div`
	margin-top: 2rem;
`;

const DesktopActionBar = styled.div`
	display: flex;
	gap: 10px;
	margin: 0 0 16px;
	padding: 10px;
	position: static;
	top: auto;
	z-index: 1;
	background: #fff;
	border: 1px solid #ece0d6;
	border-radius: 12px;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);

	@media (max-width: 900px) {
		flex-direction: column;
	}
`;

const MobileStickyActions = styled.div`
	position: sticky;
	bottom: 8px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	background: #fff;
	border: 1px solid #ece0d6;
	border-radius: 12px;
	padding: 10px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
	z-index: 20;

	@media (max-width: 380px) {
		grid-template-columns: 1fr;
	}
`;

const TextElement = styled.div`
	z-index: 2 !important;
`;
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

const PersonalizationPanel = styled.div`
	background: linear-gradient(180deg, #fffaf5 0%, #fff 100%);
	padding: 16px;
	margin-bottom: 16px;
	border-radius: 8px;
	border: 1px solid #f2e4d9;
	box-shadow: var(--box-shadow-light);
`;

const PersonalizationHint = styled.p`
	margin: 10px 0;
	font-size: 0.9rem;
	color: var(--text-color-secondary);
`;

const PresetPreviewBox = styled.div`
	margin-top: 10px;
	padding: 12px;
	border-radius: 12px;
	background: linear-gradient(160deg, #fff9f3 0%, #ffffff 100%);
	border: 1px solid #eadbcc;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
`;

const PresetPreviewText = styled.div`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 11px 15px;
	line-height: 1.25;
	text-wrap: balance;
	min-height: 52px;
	max-width: 100%;
`;

const PresetIconBubble = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	min-width: 30px;
	height: 30px;
	border-radius: 999px;
	border: 1px solid rgba(0, 0, 0, 0.14);
	font-size: 1rem;
	font-weight: 700;
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
	left: 20%;
	width: 60%;
	height: 75%;
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

const CenterIndicator = styled.div`
	position: absolute;
	top: 0;
	bottom: 0;
	width: 0;
	left: 50%;
	transform: translateX(-50%);
	pointer-events: none;
	z-index: 9999;
	border-left: 1px dashed rgba(222, 53, 32, 0.55);
`;

const HorizontalCenterIndicator = styled.div`
	position: absolute;
	left: 0;
	right: 0;
	height: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	z-index: 9999;
	border-top: 1px dashed rgba(222, 53, 32, 0.55);
`;

const CenterGuideDot = styled.div`
	position: absolute;
	left: 50%;
	top: 50%;
	width: 7px;
	height: 7px;
	transform: translate(-50%, -50%);
	border-radius: 50%;
	background: rgba(222, 53, 32, 0.75);
	box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
	pointer-events: none;
	z-index: 10000;
`;

const FrameContextMenu = styled.div`
	position: fixed;
	min-width: 168px;
	background: #ffffff;
	border: 1px solid rgba(16, 24, 40, 0.14);
	border-radius: 10px;
	box-shadow: 0 8px 24px rgba(16, 24, 40, 0.2);
	padding: 6px;
	z-index: 1000001;
`;

const FrameContextMenuItem = styled.button`
	display: block;
	width: 100%;
	border: 0;
	background: transparent;
	padding: 8px 10px;
	border-radius: 8px;
	text-align: left;
	font-size: 0.9rem;
	color: #1f2937;
	cursor: pointer;

	&:hover:not(:disabled) {
		background: #f5f7fa;
	}

	&:disabled {
		color: #9ca3af;
		cursor: not-allowed;
	}
`;

const UploadOverlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(128, 128, 128, 0.5);
	z-index: 9999999;
	display: flex;
	align-items: center;
	justify-content: center;
`;

const PreviewLoadingWrap = styled.div`
	min-height: 200px;
	display: flex;
	flex-direction: column;
	gap: 14px;
	align-items: center;
	justify-content: center;
`;

const PreviewProgressBox = styled.div`
	width: min(420px, 90%);
`;

const PreviewStatusText = styled.p`
	margin: 0 0 8px;
	font-size: 0.95rem;
	color: var(--text-color-secondary);
	text-align: center;
`;

const PreviewImagesGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 12px;
`;

const PreviewImageCard = styled.div`
	border: 1px solid #ebe0d4;
	border-radius: 12px;
	overflow: hidden;
	background: #fff;

	img {
		width: 100%;
		height: auto;
		display: block;
	}
`;

/*
const AnimationPODWalkThroughWrapper = styled.div`
	position: absolute;
	top: 50%;
	left: -80px;
	z-index: 1;

	@media (max-width: 700px) {
		left: -220px;
		top: 40%;

		.addCartWrapper {
			bottom: 20px !important;
			button {
				position: absolute;
				left: 180px;
				top: -90px;
				width: 200px !important;
			}
		}
	}
`;
*/


