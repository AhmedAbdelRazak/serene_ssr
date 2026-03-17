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
import SlickBaseStyles from "../../components/SlickBaseStyles";

import html2canvas from "html2canvas";
import { useCartContext } from "../../cart_context";
import { Rnd } from "react-rnd";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";

// GA 4
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";

import {
	buildPodSelectionFromVariant,
	findMatchingPodVariant,
	findPodProductOption,
	findPodProductOptionValue,
	getPodOptionValueLabel,
	normalizePodProduct,
	resolveInitialPodVariantSelection,
} from "@/lib/pod-product";
import { getPodDefaultDesignImage } from "@/lib/product-helpers";
import { useLegacySeoEnabled } from "../../bootstrap/legacySeo";
import { useLegacyRouteBootstrap } from "../../bootstrap/LegacyRouteBootstrapContext";

// Child tutorial/animation (temporarily disabled on the single POD page)
// import AnimationPODWalkThrough from "../MyAnimationComponents/AnimationPODWalkThrough";
import {
	POD_OCCASION_OPTIONS,
	buildPersonalizationSearch,
	resolvePodPersonalization,
	savePodPersonalization,
	buildGiftMessage,
	getOccasionOption,
} from "./podPersonalization";
import { getOccasionDesignPreset } from "./podDesignPresets";

const { Title } = Typography;
const { Option } = Select;
const POD_ADVANCED_MODE_KEY = "podAdvancedModeEnabledV1";
const POD_FONT_STYLESHEET =
	"https://fonts.googleapis.com/css2?family=Allura&family=Dancing+Script&family=Great+Vibes&family=Lobster&display=swap";

function clampNumber(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

let domToImageModulePromise = null;

async function getDomToImage() {
	if (typeof window === "undefined") {
		throw new Error("dom-to-image is only available in the browser.");
	}
	if (!domToImageModulePromise) {
		domToImageModulePromise = import("dom-to-image-more").then(
			(module) => module.default || module
		);
	}
	return domToImageModulePromise;
}

function normalizeVariantToken(value = "") {
	return `${value || ""}`.trim().toLowerCase().replace(/["']/g, "");
}

function normalizeColorToken(value = "") {
	const raw = `${value || ""}`.trim().toLowerCase();
	if (!raw) return "";
	const stripped = raw.startsWith("#") ? raw.slice(1) : raw;
	if (!/^[0-9a-f]{3,8}$/i.test(stripped)) {
		return raw.startsWith("#") ? raw : `#${raw}`;
	}
	if (stripped.length === 3 || stripped.length === 4) {
		return `#${stripped
			.split("")
			.map((char) => `${char}${char}`)
			.join("")}`;
	}
	return `#${stripped}`;
}

function normalizeSearchParamsString(search = "") {
	const params = new URLSearchParams(`${search || ""}`.replace(/^\?/, ""));
	const normalized = new URLSearchParams();
	[...params.entries()]
		.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
			if (leftKey === rightKey) {
				return `${leftValue}`.localeCompare(`${rightValue}`);
			}
			return `${leftKey}`.localeCompare(`${rightKey}`);
		})
		.forEach(([key, value]) => {
			normalized.append(key, value);
		});
	const next = normalized.toString();
	return next ? `?${next}` : "";
}

function looksLikeHexColor(value = "") {
	return /^#?[0-9a-f]{3,8}$/i.test(`${value || ""}`.trim());
}

function getVariantTitleParts(variant = null) {
	return `${variant?.title || ""}`
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean);
}

async function postFacebookConversion(payload = {}) {
	try {
		await fetch("/api/track/conversion", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			keepalive: true,
		});
	} catch {}
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
	if (normalizedName.includes("candle")) return "candle";
	return "default";
}

function normalizePrintAreaPosition(value = "") {
	return `${value || ""}`
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "_");
}

function formatPrintAreaLabel(position = "") {
	const safe = normalizePrintAreaPosition(position);
	if (!safe) return "Front";
	return safe
		.split("_")
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(" ");
}

const POD_EDITOR_FRAME_CONFIG = {
	byBlueprint: {
		478: {
			front: { top: "28%", left: "18%", width: "64%", height: "50%", clampInset: 3 },
		},
		479: {
			front: { top: "28%", left: "18%", width: "64%", height: "50%", clampInset: 3 },
		},
		220: {
			front: { top: "30%", left: "29%", width: "42%", height: "42%", clampInset: 2 },
		},
		326: {
			front: { top: "38%", left: "20%", width: "60%", height: "54%", clampInset: 1 },
		},
		1048: {
			front: { top: "35%", left: "30%", width: "40%", height: "44%", clampInset: 2 },
		},
		1313: {
			front: { top: "28%", left: "27%", width: "46%", height: "54%", clampInset: 3 },
			back: { top: "28%", left: "27%", width: "46%", height: "54%", clampInset: 3 },
		},
		1464: {
			front: { top: "12%", left: "12%", width: "76%", height: "76%", clampInset: 1 },
		},
	},
	byKind: {
		apparel: {
			front: { top: "20%", left: "23%", width: "54%", height: "68%", clampInset: 4 },
			back: { top: "20%", left: "23%", width: "54%", height: "68%", clampInset: 4 },
		},
		hoodie: {
			front: { top: "23%", left: "25%", width: "50%", height: "63%", clampInset: 4 },
			back: { top: "20%", left: "23%", width: "54%", height: "69%", clampInset: 4 },
			left_sleeve: { top: "30%", left: "8%", width: "13%", height: "37%", clampInset: 4 },
			right_sleeve: { top: "30%", left: "79%", width: "13%", height: "37%", clampInset: 4 },
			neck: { top: "18%", left: "44%", width: "12%", height: "10%", clampInset: 2 },
		},
		tote: {
			front: { top: "28%", left: "27%", width: "46%", height: "54%", clampInset: 3 },
			back: { top: "28%", left: "27%", width: "46%", height: "54%", clampInset: 3 },
		},
		bag: {
			front: { top: "38%", left: "20%", width: "60%", height: "54%", clampInset: 1 },
		},
		mug: {
			front: { top: "28%", left: "18%", width: "64%", height: "50%", clampInset: 3 },
		},
		pillow: {
			front: { top: "30%", left: "29%", width: "42%", height: "42%", clampInset: 2 },
		},
		magnet: {
			front: { top: "12%", left: "12%", width: "76%", height: "76%", clampInset: 1 },
		},
		candle: {
			front: { top: "35%", left: "30%", width: "40%", height: "44%", clampInset: 2 },
		},
		default: {
			front: { top: "20%", left: "20%", width: "60%", height: "75%", clampInset: 3 },
		},
	},
};

function getPodEditorSurfaceConfig(product = {}, positionInput = "") {
	const kind = getPodProductKindForDefaultDesign(product);
	const position = normalizePrintAreaPosition(positionInput || "front");
	const blueprintId = Number(product?.printifyProductDetails?.blueprint_id || 0);
	const blueprintConfig =
		POD_EDITOR_FRAME_CONFIG.byBlueprint[blueprintId]?.[position] ||
		POD_EDITOR_FRAME_CONFIG.byBlueprint[blueprintId]?.front ||
		null;
	if (blueprintConfig) return blueprintConfig;
	const kindConfig = POD_EDITOR_FRAME_CONFIG.byKind[kind] || POD_EDITOR_FRAME_CONFIG.byKind.default;
	return kindConfig[position] || kindConfig.front || POD_EDITOR_FRAME_CONFIG.byKind.default.front;
}

function getPodPlaceholderAspectRatio(placeholder = null) {
	const explicitRatio = Number(placeholder?.aspect_ratio || 0);
	if (explicitRatio > 0) return explicitRatio;
	const width = Number(placeholder?.width || 0);
	const height = Number(placeholder?.height || 0);
	if (width > 0 && height > 0) {
		return width / height;
	}
	return 0;
}

function parsePercentValue(value = "") {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const parsed = parseFloat(`${value || ""}`.replace("%", ""));
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercentValue(value = 0) {
	return `${Number(value).toFixed(4).replace(/\.?0+$/, "")}%`;
}

function buildFramePixelRectFromPercent(
	frame = {},
	containerWidth = 0,
	containerHeight = 0
) {
	const safeContainerWidth = Math.max(0, Number(containerWidth) || 0);
	const safeContainerHeight = Math.max(0, Number(containerHeight) || 0);
	return {
		x: (parsePercentValue(frame.left) / 100) * safeContainerWidth,
		y: (parsePercentValue(frame.top) / 100) * safeContainerHeight,
		width: (parsePercentValue(frame.width) / 100) * safeContainerWidth,
		height: (parsePercentValue(frame.height) / 100) * safeContainerHeight,
	};
}

function buildPercentFrameFromPixelRect(
	rect = {},
	containerWidth = 0,
	containerHeight = 0
) {
	const safeContainerWidth = Math.max(1, Number(containerWidth) || 1);
	const safeContainerHeight = Math.max(1, Number(containerHeight) || 1);
	return {
		left: formatPercentValue((rect.x / safeContainerWidth) * 100),
		top: formatPercentValue((rect.y / safeContainerHeight) * 100),
		width: formatPercentValue((rect.width / safeContainerWidth) * 100),
		height: formatPercentValue((rect.height / safeContainerHeight) * 100),
	};
}

function getFrameDifferenceScore(frameA = {}, frameB = {}) {
	return Math.max(
		Math.abs(parsePercentValue(frameA.left) - parsePercentValue(frameB.left)),
		Math.abs(parsePercentValue(frameA.top) - parsePercentValue(frameB.top)),
		Math.abs(parsePercentValue(frameA.width) - parsePercentValue(frameB.width)),
		Math.abs(parsePercentValue(frameA.height) - parsePercentValue(frameB.height))
	);
}

function clampPixelRectWithinContainer(
	rect = {},
	containerWidth = 0,
	containerHeight = 0
) {
	const safeContainerWidth = Math.max(1, Number(containerWidth) || 1);
	const safeContainerHeight = Math.max(1, Number(containerHeight) || 1);
	const width = clampNumber(Number(rect.width) || 0, 24, safeContainerWidth);
	const height = clampNumber(Number(rect.height) || 0, 24, safeContainerHeight);
	return {
		x: clampNumber(Number(rect.x) || 0, 0, safeContainerWidth - width),
		y: clampNumber(Number(rect.y) || 0, 0, safeContainerHeight - height),
		width,
		height,
	};
}

function getCombinedElementBounds(elements = []) {
	const safeElements = Array.isArray(elements) ? elements.filter(Boolean) : [];
	if (!safeElements.length) return null;
	const minX = Math.min(...safeElements.map((item) => Number(item.x) || 0));
	const minY = Math.min(...safeElements.map((item) => Number(item.y) || 0));
	const maxX = Math.max(
		...safeElements.map(
			(item) => (Number(item.x) || 0) + Math.max(0, Number(item.width) || 0)
		)
	);
	const maxY = Math.max(
		...safeElements.map(
			(item) => (Number(item.y) || 0) + Math.max(0, Number(item.height) || 0)
		)
	);
	return {
		x: minX,
		y: minY,
		width: Math.max(0, maxX - minX),
		height: Math.max(0, maxY - minY),
	};
}

function getRankedMockupImagesForSurface(product = {}, positionInput = "") {
	const sourceImages = Array.isArray(product?.images) ? product.images : [];
	return [...sourceImages].sort(
		(left, right) =>
			scoreMockupImageForSurface(right, positionInput, product) -
			scoreMockupImageForSurface(left, positionInput, product)
	);
}

function getPodDefaultDesignReferenceImageUrls(
	product = {},
	{ occasion = "", color = "", size = "", scent = "" } = {}
) {
	const urls = [];
	for (let viewIndex = 0; viewIndex < 6; viewIndex += 1) {
		const url = getPodDefaultDesignImage(product, {
			occasion,
			name: "",
			color,
			size,
			scent,
			viewIndex,
			allowOccasionFallback: true,
		});
		if (url && !urls.includes(url)) {
			urls.push(url);
		}
	}
	return urls;
}

function createAnalysisCanvas(width = 1, height = 1) {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width) || 1);
	canvas.height = Math.max(1, Math.round(height) || 1);
	return canvas;
}

function loadAnalysisImage(src = "") {
	return new Promise((resolve, reject) => {
		if (!src) {
			reject(new Error("Missing image source."));
			return;
		}
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.decoding = "async";
		image.onload = () => {
			resolve({
				image,
				width: image.naturalWidth || image.width || 0,
				height: image.naturalHeight || image.height || 0,
			});
		};
		image.onerror = () => reject(new Error(`Failed to load analysis image: ${src}`));
		image.src = src;
	});
}

function extractAnalysisImageData(image, width = 1, height = 1) {
	const canvas = createAnalysisCanvas(width, height);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

function computeAveragePixelDifference(baseData, compareData, step = 1) {
	const stride = Math.max(1, Number(step) || 1);
	let total = 0;
	let count = 0;
	for (let y = 0; y < baseData.height; y += stride) {
		for (let x = 0; x < baseData.width; x += stride) {
			const offset = (y * baseData.width + x) * 4;
			total +=
				Math.abs(baseData.data[offset] - compareData.data[offset]) +
				Math.abs(baseData.data[offset + 1] - compareData.data[offset + 1]) +
				Math.abs(baseData.data[offset + 2] - compareData.data[offset + 2]);
			count += 3;
		}
	}
	return count > 0 ? total / count : Number.POSITIVE_INFINITY;
}

function detectNormalizedDifferenceBounds(
	baseData,
	compareData,
	{
		pixelThreshold = 34,
		minChangedColumnsRatio = 0.004,
		minChangedRowsRatio = 0.004,
	} = {}
) {
	const width = baseData.width;
	const height = baseData.height;
	const rowCounts = new Array(height).fill(0);
	const columnCounts = new Array(width).fill(0);
	let changedPixels = 0;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const offset = (y * width + x) * 4;
			const diff =
				Math.abs(baseData.data[offset] - compareData.data[offset]) +
				Math.abs(baseData.data[offset + 1] - compareData.data[offset + 1]) +
				Math.abs(baseData.data[offset + 2] - compareData.data[offset + 2]);
			if (diff < pixelThreshold) continue;
			rowCounts[y] += 1;
			columnCounts[x] += 1;
			changedPixels += 1;
		}
	}

	if (!changedPixels) return null;

	const minChangedColumns = Math.max(1, Math.round(height * minChangedColumnsRatio));
	const minChangedRows = Math.max(1, Math.round(width * minChangedRowsRatio));
	let minX = width;
	let maxX = -1;
	let minY = height;
	let maxY = -1;

	for (let x = 0; x < width; x += 1) {
		if (columnCounts[x] < minChangedColumns) continue;
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
	}
	for (let y = 0; y < height; y += 1) {
		if (rowCounts[y] < minChangedRows) continue;
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
	}

	if (maxX < minX || maxY < minY) return null;

	const padX = Math.max(1, Math.round((maxX - minX + 1) * 0.06));
	const padY = Math.max(1, Math.round((maxY - minY + 1) * 0.08));
	const paddedMinX = clampNumber(minX - padX, 0, width);
	const paddedMinY = clampNumber(minY - padY, 0, height);
	const paddedMaxX = clampNumber(maxX + padX, 0, width - 1);
	const paddedMaxY = clampNumber(maxY + padY, 0, height - 1);
	const bboxWidth = Math.max(1, paddedMaxX - paddedMinX + 1);
	const bboxHeight = Math.max(1, paddedMaxY - paddedMinY + 1);
	const areaRatio = (bboxWidth * bboxHeight) / Math.max(1, width * height);

	return {
		x: paddedMinX / width,
		y: paddedMinY / height,
		width: bboxWidth / width,
		height: bboxHeight / height,
		areaRatio,
	};
}

function getCoverPlacement(containerWidth, containerHeight, imageWidth, imageHeight) {
	const safeContainerWidth = Math.max(1, Number(containerWidth) || 1);
	const safeContainerHeight = Math.max(1, Number(containerHeight) || 1);
	const safeImageWidth = Math.max(1, Number(imageWidth) || 1);
	const safeImageHeight = Math.max(1, Number(imageHeight) || 1);
	const scale = Math.max(
		safeContainerWidth / safeImageWidth,
		safeContainerHeight / safeImageHeight
	);
	const width = safeImageWidth * scale;
	const height = safeImageHeight * scale;
	return {
		x: (safeContainerWidth - width) / 2,
		y: (safeContainerHeight - height) / 2,
		width,
		height,
	};
}

function mapNormalizedRectToPixelRect(normalizedRect = {}, placement = {}) {
	return {
		x: placement.x + Number(normalizedRect.x || 0) * placement.width,
		y: placement.y + Number(normalizedRect.y || 0) * placement.height,
		width: Number(normalizedRect.width || 0) * placement.width,
		height: Number(normalizedRect.height || 0) * placement.height,
	};
}

async function inferDynamicPrintAreaFrameFromReferenceImages({
	baseImageSrc = "",
	referenceImageUrls = [],
	containerWidth = 0,
	containerHeight = 0,
	relativeDesignBounds = null,
} = {}) {
	if (
		typeof window === "undefined" ||
		!baseImageSrc ||
		!Array.isArray(referenceImageUrls) ||
		!referenceImageUrls.length ||
		!relativeDesignBounds
	) {
		return null;
	}

	const baseImage = await loadAnalysisImage(baseImageSrc);
	if (!(baseImage.width > 0) || !(baseImage.height > 0)) return null;

	const maxDimension = Math.max(baseImage.width, baseImage.height);
	const scale = maxDimension > 420 ? 420 / maxDimension : 1;
	const analysisWidth = Math.max(64, Math.round(baseImage.width * scale));
	const analysisHeight = Math.max(64, Math.round(baseImage.height * scale));
	const baseData = extractAnalysisImageData(
		baseImage.image,
		analysisWidth,
		analysisHeight
	);

	let bestMatch = null;
	for (const referenceUrl of referenceImageUrls) {
		try {
			const referenceImage = await loadAnalysisImage(referenceUrl);
			const referenceData = extractAnalysisImageData(
				referenceImage.image,
				analysisWidth,
				analysisHeight
			);
			const similarity = computeAveragePixelDifference(baseData, referenceData, 2);
			const diffBounds = detectNormalizedDifferenceBounds(baseData, referenceData);
			if (!diffBounds) continue;
			if (diffBounds.areaRatio <= 0.0015 || diffBounds.areaRatio >= 0.42) {
				continue;
			}
			if (!bestMatch || similarity < bestMatch.similarity) {
				bestMatch = {
					similarity,
					diffBounds,
				};
			}
		} catch {}
	}

	if (!bestMatch?.diffBounds) return null;

	const coverPlacement = getCoverPlacement(
		containerWidth,
		containerHeight,
		baseImage.width,
		baseImage.height
	);
	const detectedDesignRect = mapNormalizedRectToPixelRect(
		bestMatch.diffBounds,
		coverPlacement
	);
	if (
		!(relativeDesignBounds.width > 0) ||
		!(relativeDesignBounds.height > 0) ||
		!(detectedDesignRect.width > 0) ||
		!(detectedDesignRect.height > 0)
	) {
		return null;
	}

	const inferredFrameRect = clampPixelRectWithinContainer(
		{
			x:
				detectedDesignRect.x -
				Number(relativeDesignBounds.x || 0) *
					(detectedDesignRect.width / Number(relativeDesignBounds.width || 1)),
			y:
				detectedDesignRect.y -
				Number(relativeDesignBounds.y || 0) *
					(detectedDesignRect.height / Number(relativeDesignBounds.height || 1)),
			width:
				detectedDesignRect.width / Number(relativeDesignBounds.width || 1),
			height:
				detectedDesignRect.height / Number(relativeDesignBounds.height || 1),
		},
		containerWidth,
		containerHeight
	);

	return buildPercentFrameFromPixelRect(
		inferredFrameRect,
		containerWidth,
		containerHeight
	);
}

function fitFrameToPlaceholderAspectRatio(frame = {}, placeholder = null) {
	const aspectRatio = getPodPlaceholderAspectRatio(placeholder);
	if (!(aspectRatio > 0)) return frame;

	const regionTop = parsePercentValue(frame.top);
	const regionLeft = parsePercentValue(frame.left);
	const regionWidth = Math.max(0, parsePercentValue(frame.width));
	const regionHeight = Math.max(0, parsePercentValue(frame.height));
	if (!(regionWidth > 0) || !(regionHeight > 0)) return frame;

	let nextWidth = regionWidth;
	let nextHeight = nextWidth / aspectRatio;
	if (nextHeight > regionHeight) {
		nextHeight = regionHeight;
		nextWidth = nextHeight * aspectRatio;
	}

	const nextLeft = regionLeft + (regionWidth - nextWidth) / 2;
	const nextTop = regionTop + (regionHeight - nextHeight) / 2;
	return {
		top: formatPercentValue(nextTop),
		left: formatPercentValue(nextLeft),
		width: formatPercentValue(nextWidth),
		height: formatPercentValue(nextHeight),
	};
}

function shouldKeepBaseEditorFrame(product = {}, positionInput = "") {
	const kind = getPodProductKindForDefaultDesign(product);
	const position = normalizePrintAreaPosition(positionInput || "front");
	const blueprintId = Number(product?.printifyProductDetails?.blueprint_id || 0);
	return (
		(kind === "bag" && position === "front" && blueprintId === 326) ||
		(kind === "mug" && position === "front") ||
		(kind === "pillow" && position === "front") ||
		(kind === "magnet" && position === "front") ||
		(kind === "candle" && position === "front")
	);
}

function getPodPrintAreaFrame(product = {}, positionInput = "", placeholder = null) {
	const config = getPodEditorSurfaceConfig(product, positionInput);
	const baseFrame = {
		top: config.top,
		left: config.left,
		width: config.width,
		height: config.height,
	};
	if (shouldKeepBaseEditorFrame(product, positionInput)) {
		return baseFrame;
	}
	return fitFrameToPlaceholderAspectRatio(baseFrame, placeholder);
}

function getPodPrintifySafeInsetPercent(product = {}, positionInput = "") {
	return Number(getPodEditorSurfaceConfig(product, positionInput)?.clampInset || 0);
}

function supportsDynamicVisualFrameInference(product = {}, positionInput = "") {
	return !shouldKeepBaseEditorFrame(product, positionInput);
}

function tunePodVisualPrintAreaFrame(frame = {}, product = {}, positionInput = "") {
	const kind = getPodProductKindForDefaultDesign(product);
	const position = normalizePrintAreaPosition(positionInput || "front");
	if (kind !== "bag" || position !== "front") return frame;
	const blueprintId = Number(product?.printifyProductDetails?.blueprint_id || 0);
	const top = parsePercentValue(frame.top);
	const height = parsePercentValue(frame.height);
	const shrinkFactor = blueprintId === 326 ? 0.66 : 0.84;
	const nextHeight = clampNumber(
		height * shrinkFactor,
		8,
		Math.max(8, 100 - top)
	);
	const centerPreservingTop =
		blueprintId === 326
			? top + (height - nextHeight) * 0.57
			: top + (height - nextHeight) / 2;
	return {
		...frame,
		top: formatPercentValue(
			clampNumber(centerPreservingTop + (blueprintId === 326 ? 0.35 : 0.4), 0, 100 - nextHeight)
		),
		height: formatPercentValue(nextHeight),
	};
}

function getPodCaptureProjection(product = {}, positionInput = "") {
	const kind = getPodProductKindForDefaultDesign(product);
	const position = normalizePrintAreaPosition(positionInput || "front");
	if (kind === "mug" && position === "front") {
		return {
			x: 0.5,
			y: 0.5,
			scale: 0.86,
		};
	}
	if (kind === "pillow" && position === "front") {
		return {
			x: 0.25,
			y: 0.5,
			scale: 0.56,
		};
	}
	if (kind === "bag" && position === "front") {
		const blueprintId = Number(product?.printifyProductDetails?.blueprint_id || 0);
		if (blueprintId === 326) {
			return {
				x: 0.5,
				y: 0.272,
				scale: 1.05,
			};
		}
		return {
			x: 0.5,
			y: 0.31,
			scale: 0.99,
		};
	}
	return null;
}

function getSupportedPrintAreaPositions(product = {}, variantLayouts = []) {
	const positions = new Set();
	const sourcePrintAreas = Array.isArray(product?.printifyProductDetails?.print_areas)
		? product.printifyProductDetails.print_areas
		: [];
	sourcePrintAreas.forEach((area) => {
		(area?.placeholders || []).forEach((placeholder) => {
			const position = normalizePrintAreaPosition(placeholder?.position || "");
			if (position) positions.add(position);
		});
	});
	(variantLayouts || []).forEach((variant) => {
		(variant?.placeholders || []).forEach((placeholder) => {
			const position = normalizePrintAreaPosition(placeholder?.position || "");
			if (position) positions.add(position);
		});
	});
	if (!positions.size) positions.add("front");
	const preferredOrder = [
		"front",
		"back",
		"left_chest",
		"right_chest",
		"left_sleeve",
		"right_sleeve",
		"neck",
	];
	return Array.from(positions).sort((left, right) => {
		const leftIndex = preferredOrder.indexOf(left);
		const rightIndex = preferredOrder.indexOf(right);
		if (leftIndex === -1 && rightIndex === -1) {
			return left.localeCompare(right);
		}
		if (leftIndex === -1) return 1;
		if (rightIndex === -1) return -1;
		return leftIndex - rightIndex;
	});
}

function getMockupCameraLabel(image = {}) {
	const explicit = `${image?.camera_label || image?.cameraLabel || ""}`.trim();
	if (explicit) return explicit.toLowerCase();
	const src = `${image?.src || ""}`;
	try {
		const url = new URL(src);
		const label = `${url.searchParams.get("camera_label") || ""}`.trim();
		if (label) return label.toLowerCase();
	} catch {}
	const match = src.toLowerCase().match(/camera_label=([a-z0-9_-]+)/i);
	return match?.[1] || "";
}

function scoreMockupImageForSurface(image = {}, positionInput = "", product = {}) {
	const cameraLabel = getMockupCameraLabel(image);
	const position = normalizePrintAreaPosition(positionInput || "front");
	const kind = getPodProductKindForDefaultDesign(product);
	let score = 0;

	if (position === "front" && cameraLabel === "front") score += 30;
	if (position === "back" && cameraLabel === "back") score += 30;
	if (position.includes("left") && cameraLabel.includes("left")) score += 18;
	if (position.includes("right") && cameraLabel.includes("right")) score += 18;
	if (position.includes("neck") && cameraLabel === "front") score += 14;
	if (cameraLabel.includes("angled")) score += kind === "mug" ? 10 : 2;
	if (kind === "mug" && (cameraLabel === "right" || cameraLabel === "left")) {
		score += 12;
	}
	if (/(inside|open|bottom)/.test(cameraLabel)) score -= 20;
	if (image?.is_default) score += 2;
	if (!cameraLabel && image?.is_default) score += 1;
	return score;
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

function normalizeElementRectsWithinBounds(elements = [], bounds) {
	return (Array.isArray(elements) ? elements : []).map((item) => {
		const clamped = clampElementRectWithinBounds(
			{
				x: item.x,
				y: item.y,
				width: item.width,
				height: item.height,
			},
			bounds
		);
		return {
			...item,
			x: clamped.x,
			y: clamped.y,
			width: clamped.width,
			height: clamped.height,
		};
	});
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
			messageWidthRatio: 0.74,
			messageHeightRatio: 0.3,
			messageCenterYRatio: 0.48,
			iconSizeRatio: 0.104,
			iconOverlapPx: 10,
			maxMessageHeight: 126,
			maxIconSize: 58,
		},
		bag: {
			messageWidthRatio: 0.7,
			messageHeightRatio: 0.24,
			messageCenterYRatio: 0.5,
			iconSizeRatio: 0.09,
			iconOverlapPx: 6,
			maxMessageHeight: 94,
			maxIconSize: 52,
		},
		mug: {
			messageWidthRatio: 0.58,
			messageHeightRatio: 0.285,
			messageCenterYRatio: 0.36,
			iconSizeRatio: 0.102,
			iconOverlapPx: 6,
			maxMessageHeight: 98,
			maxIconSize: 52,
		},
		pillow: {
			messageWidthRatio: 0.96,
			messageHeightRatio: 0.95,
			messageCenterYRatio: 0.54,
			iconSizeRatio: 0.112,
			iconOverlapPx: 44,
			maxMessageHeight: 360,
			maxIconSize: 60,
		},
		magnet: {
			messageWidthRatio: 0.985,
			messageHeightRatio: 0.955,
			messageCenterYRatio: 0.54,
			iconSizeRatio: 0.138,
			iconOverlapPx: 22,
			maxMessageHeight: 560,
			maxIconSize: 68,
		},
		candle: {
			messageWidthRatio: 0.98,
			messageHeightRatio: 0.9,
			messageCenterYRatio: 0.58,
			iconSizeRatio: 0.13,
			iconOverlapPx: 34,
			maxMessageHeight: 284,
			maxIconSize: 58,
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
		mug: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: -0.01,
		},
		pillow: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: 0,
		},
		candle: {
			messageWidthFactor: 1,
			messageHeightFactor: 1,
			iconSizeFactor: 1,
			centerYOffset: 0.02,
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
	const geometryOverrides =
		preset && typeof preset === "object" && preset.geometryOverrides
			? preset.geometryOverrides
			: {};
	const numberOrFallback = (value, fallback) => {
		const num = Number(value);
		return Number.isFinite(num) ? num : fallback;
	};
	const rawMessageWidthRatio = numberOrFallback(
		geometryOverrides.messageWidthRatio,
		base.messageWidthRatio,
	);
	const rawMessageHeightRatio = numberOrFallback(
		geometryOverrides.messageHeightRatio,
		base.messageHeightRatio,
	);
	const rawMessageCenterYRatio = numberOrFallback(
		geometryOverrides.messageCenterYRatio,
		base.messageCenterYRatio,
	);
	const rawIconSizeRatio = numberOrFallback(
		geometryOverrides.iconSizeRatio,
		base.iconSizeRatio,
	);
	return {
		kind,
		messageWidthRatio: clampNumber(
			rawMessageWidthRatio * Number(visualTune.messageWidthFactor || 1),
			0.34,
			kind === "candle"
				? 0.98
				: kind === "magnet"
					? 0.99
					: kind === "pillow"
						? 0.95
						: 0.72,
		),
		messageHeightRatio: clampNumber(
			rawMessageHeightRatio * Number(visualTune.messageHeightFactor || 1),
			0.1,
			kind === "candle"
				? 0.92
				: kind === "magnet"
					? 0.97
					: kind === "pillow"
						? 0.84
						: 0.3,
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
		iconOverlapPx: numberOrFallback(
			geometryOverrides.iconOverlapPx,
			base.iconOverlapPx
		),
		maxMessageHeight: clampNumber(
			numberOrFallback(
				geometryOverrides.maxMessageHeight,
				base.maxMessageHeight || 74
			),
			74,
			kind === "candle"
				? 300
				: kind === "magnet"
					? 560
					: kind === "pillow"
						? 320
						: 140,
		),
		maxIconSize: clampNumber(
			numberOrFallback(
				geometryOverrides.maxIconSize,
				base.maxIconSize || 44
			),
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
		boxSizing: "border-box",
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

function configureCanvasRenderingQuality(context) {
	if (!context) return;
	context.imageSmoothingEnabled = true;
	if ("imageSmoothingQuality" in context) {
		context.imageSmoothingQuality = "high";
	}
}

function remapCanvasToAspectRatio(canvas, targetAspectRatio = 0) {
	const safeTargetAspectRatio = Number(targetAspectRatio) || 0;
	if (!canvas || !(safeTargetAspectRatio > 0)) return canvas;
	const sourceWidth = Math.max(1, Number(canvas.width) || 1);
	const sourceHeight = Math.max(1, Number(canvas.height) || 1);
	const currentAspectRatio = sourceWidth / sourceHeight;
	if (Math.abs(currentAspectRatio - safeTargetAspectRatio) <= 0.01) {
		return canvas;
	}
	const targetWidth =
		currentAspectRatio < safeTargetAspectRatio
			? Math.max(1, Math.round(sourceHeight * safeTargetAspectRatio))
			: sourceWidth;
	const targetHeight =
		currentAspectRatio > safeTargetAspectRatio
			? Math.max(1, Math.round(sourceWidth / safeTargetAspectRatio))
			: sourceHeight;
	const remappedCanvas = document.createElement("canvas");
	remappedCanvas.width = targetWidth;
	remappedCanvas.height = targetHeight;
	const context = remappedCanvas.getContext("2d");
	configureCanvasRenderingQuality(context);
	context.clearRect(0, 0, targetWidth, targetHeight);
	const drawX = Math.round((targetWidth - sourceWidth) / 2);
	const drawY = Math.round((targetHeight - sourceHeight) / 2);
	context.drawImage(canvas, drawX, drawY, sourceWidth, sourceHeight);
	return remappedCanvas;
}

function projectCanvasToPrintifyPlaceholder(
	canvas,
	{ targetAspectRatio = 0, projection = null } = {}
) {
	const safeTargetAspectRatio = Number(targetAspectRatio) || 0;
	const safeProjectionScale = Math.max(0.08, Number(projection?.scale) || 0);
	if (!canvas || !projection || !(safeProjectionScale > 0) || !(safeTargetAspectRatio > 0)) {
		return remapCanvasToAspectRatio(canvas, safeTargetAspectRatio);
	}
	const sourceWidth = Math.max(1, Number(canvas.width) || 1);
	const sourceHeight = Math.max(1, Number(canvas.height) || 1);
	const targetWidth = Math.max(1, Math.round(sourceWidth / safeProjectionScale));
	const targetHeight = Math.max(
		1,
		Math.round(targetWidth / safeTargetAspectRatio)
	);
	const drawWidth = Math.max(
		1,
		Math.round(targetWidth * safeProjectionScale)
	);
	const drawHeight = Math.max(
		1,
		Math.round(drawWidth / Math.max(0.08, sourceWidth / sourceHeight))
	);
	const drawX = Math.round(
		(Number(projection.x || 0.5) * targetWidth) - drawWidth / 2
	);
	const drawY = Math.round(
		(Number(projection.y || 0.5) * targetHeight) - drawHeight / 2
	);
	const projectedCanvas = document.createElement("canvas");
	projectedCanvas.width = targetWidth;
	projectedCanvas.height = targetHeight;
	const context = projectedCanvas.getContext("2d");
	configureCanvasRenderingQuality(context);
	context.clearRect(0, 0, targetWidth, targetHeight);
	// Project the raw print-area capture into the Printify placeholder once.
	context.drawImage(canvas, drawX, drawY, drawWidth, drawHeight);
	return projectedCanvas;
}

function getNonTransparentCanvasBounds(
	canvas,
	{ alphaThreshold = 8, padding = 2 } = {}
) {
	if (!canvas) return null;
	const width = Math.max(1, Number(canvas.width) || 1);
	const height = Math.max(1, Number(canvas.height) || 1);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) return null;
	const imageData = context.getImageData(0, 0, width, height).data;
	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const alpha = imageData[(y * width + x) * 4 + 3];
			if (alpha <= alphaThreshold) continue;
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}
	}

	if (maxX < minX || maxY < minY) return null;
	const safePadding = Math.max(0, Math.round(Number(padding) || 0));
	const x = clampNumber(minX - safePadding, 0, width - 1);
	const y = clampNumber(minY - safePadding, 0, height - 1);
	const right = clampNumber(maxX + safePadding, 0, width - 1);
	const bottom = clampNumber(maxY + safePadding, 0, height - 1);
	return {
		x,
		y,
		width: Math.max(1, right - x + 1),
		height: Math.max(1, bottom - y + 1),
	};
}

function cropCanvasToBounds(canvas, bounds = null) {
	if (!canvas || !bounds) return canvas;
	const croppedCanvas = document.createElement("canvas");
	croppedCanvas.width = Math.max(1, Math.round(bounds.width) || 1);
	croppedCanvas.height = Math.max(1, Math.round(bounds.height) || 1);
	const context = croppedCanvas.getContext("2d");
	configureCanvasRenderingQuality(context);
	context.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
	context.drawImage(
		canvas,
		bounds.x,
		bounds.y,
		bounds.width,
		bounds.height,
		0,
		0,
		croppedCanvas.width,
		croppedCanvas.height
	);
	return croppedCanvas;
}

function getProjectedPanelRect({
	sourceWidth = 0,
	sourceHeight = 0,
	targetAspectRatio = 0,
	projection = null,
} = {}) {
	const safeSourceWidth = Math.max(1, Number(sourceWidth) || 1);
	const safeSourceHeight = Math.max(1, Number(sourceHeight) || 1);
	const safeTargetAspectRatio = Number(targetAspectRatio) || 0;
	const safeProjectionScale = Math.max(0.08, Number(projection?.scale) || 0);
	if (!projection || !(safeTargetAspectRatio > 0) || !(safeProjectionScale > 0)) {
		return {
			left: 0,
			top: 0,
			width: 1,
			height: 1,
		};
	}
	const sourceAspectRatio = safeSourceWidth / safeSourceHeight;
	const width = safeProjectionScale;
	const height = width * safeTargetAspectRatio / Math.max(0.08, sourceAspectRatio);
	return {
		left: Number(projection?.x || 0.5) - width / 2,
		top: Number(projection?.y || 0.5) - height / 2,
		width,
		height,
	};
}

function buildEditorDrivenPlacementAsset(
	rawCanvas,
	{ targetAspectRatio = 0, projection = null, contentBoundsNormalized = null } = {}
) {
	if (!projection || !(Number(targetAspectRatio) > 0)) return null;
	if (!rawCanvas) return null;
	const sourceWidth = Math.max(1, Number(rawCanvas.width) || 1);
	const sourceHeight = Math.max(1, Number(rawCanvas.height) || 1);
	const normalizedBounds =
		contentBoundsNormalized &&
		Number(contentBoundsNormalized.width) > 0 &&
		Number(contentBoundsNormalized.height) > 0
			? {
					x: clampNumber(Number(contentBoundsNormalized.x) || 0, 0, 1),
					y: clampNumber(Number(contentBoundsNormalized.y) || 0, 0, 1),
					width: clampNumber(Number(contentBoundsNormalized.width) || 0, 0, 1),
					height: clampNumber(Number(contentBoundsNormalized.height) || 0, 0, 1),
				}
			: null;
	const bounds = normalizedBounds
		? (() => {
				const normalizedLeft = clampNumber(normalizedBounds.x, 0, 1);
				const normalizedTop = clampNumber(normalizedBounds.y, 0, 1);
				const normalizedRight = clampNumber(
					normalizedBounds.x + normalizedBounds.width,
					normalizedLeft,
					1
				);
				const normalizedBottom = clampNumber(
					normalizedBounds.y + normalizedBounds.height,
					normalizedTop,
					1
				);
				return {
					x: Math.max(0, Math.round(normalizedLeft * sourceWidth)),
					y: Math.max(0, Math.round(normalizedTop * sourceHeight)),
					width: Math.max(
						1,
						Math.round((normalizedRight - normalizedLeft) * sourceWidth)
					),
					height: Math.max(
						1,
						Math.round((normalizedBottom - normalizedTop) * sourceHeight)
					),
				};
			})()
		: getNonTransparentCanvasBounds(rawCanvas);
	if (!bounds) return null;
	const croppedCanvas = cropCanvasToBounds(rawCanvas, bounds);
	const effectiveNormalizedBounds = {
		x: bounds.x / sourceWidth,
		y: bounds.y / sourceHeight,
		width: bounds.width / sourceWidth,
		height: bounds.height / sourceHeight,
	};
	const panelRect = getProjectedPanelRect({
		sourceWidth,
		sourceHeight,
		targetAspectRatio,
		projection,
	});
	const placementParams = {
		x: clampNumber(
			panelRect.left +
				(effectiveNormalizedBounds.x + effectiveNormalizedBounds.width / 2) *
					panelRect.width,
			0,
			1
		),
		y: clampNumber(
			panelRect.top +
				(effectiveNormalizedBounds.y + effectiveNormalizedBounds.height / 2) *
					panelRect.height,
			0,
			1
		),
		scale: clampNumber(panelRect.width * effectiveNormalizedBounds.width, 0.18, 2.6),
		angle: 0,
	};

	return {
		uploadCanvas: croppedCanvas,
		placementParams,
		designCoversPrintArea: false,
		isFullPrintAreaCapture: false,
		forceSourcePlacement: true,
	};
}

function buildDirectWrapPlacementAsset(
	rawCanvas,
	{ contentBoundsNormalized = null } = {}
) {
	if (!rawCanvas) return null;
	const sourceWidth = Math.max(1, Number(rawCanvas.width) || 1);
	const sourceHeight = Math.max(1, Number(rawCanvas.height) || 1);
	const normalizedBounds =
		contentBoundsNormalized &&
		Number(contentBoundsNormalized.width) > 0 &&
		Number(contentBoundsNormalized.height) > 0
			? {
					x: clampNumber(Number(contentBoundsNormalized.x) || 0, 0, 1),
					y: clampNumber(Number(contentBoundsNormalized.y) || 0, 0, 1),
					width: clampNumber(Number(contentBoundsNormalized.width) || 0, 0, 1),
					height: clampNumber(Number(contentBoundsNormalized.height) || 0, 0, 1),
				}
			: null;
	const bounds = normalizedBounds
		? (() => {
				const normalizedLeft = clampNumber(normalizedBounds.x, 0, 1);
				const normalizedTop = clampNumber(normalizedBounds.y, 0, 1);
				const normalizedRight = clampNumber(
					normalizedBounds.x + normalizedBounds.width,
					normalizedLeft,
					1
				);
				const normalizedBottom = clampNumber(
					normalizedBounds.y + normalizedBounds.height,
					normalizedTop,
					1
				);
				return {
					x: Math.max(0, Math.round(normalizedLeft * sourceWidth)),
					y: Math.max(0, Math.round(normalizedTop * sourceHeight)),
					width: Math.max(
						1,
						Math.round((normalizedRight - normalizedLeft) * sourceWidth)
					),
					height: Math.max(
						1,
						Math.round((normalizedBottom - normalizedTop) * sourceHeight)
					),
				};
			})()
		: getNonTransparentCanvasBounds(rawCanvas);
	if (!bounds) return null;
	const croppedCanvas = cropCanvasToBounds(rawCanvas, bounds);
	const effectiveNormalizedBounds = {
		x: bounds.x / sourceWidth,
		y: bounds.y / sourceHeight,
		width: bounds.width / sourceWidth,
		height: bounds.height / sourceHeight,
	};
	return {
		uploadCanvas: croppedCanvas,
		placementParams: {
			x: clampNumber(
				effectiveNormalizedBounds.x + effectiveNormalizedBounds.width / 2,
				0,
				1
			),
			y: clampNumber(
				effectiveNormalizedBounds.y + effectiveNormalizedBounds.height / 2,
				0,
				1
			),
			scale: clampNumber(effectiveNormalizedBounds.width, 0.18, 2.6),
			angle: 0,
		},
		designCoversPrintArea: false,
		isFullPrintAreaCapture: false,
		forceSourcePlacement: true,
	};
}

function buildPodBareCaptureAsset(rawCanvas, options = {}) {
	if (options?.placementMode === "direct-wrap") {
		const directAsset = buildDirectWrapPlacementAsset(rawCanvas, options);
		if (directAsset) return directAsset;
	}
	const dynamicAsset = buildEditorDrivenPlacementAsset(rawCanvas, options);
	if (dynamicAsset) return dynamicAsset;
	return {
		uploadCanvas: projectCanvasToPrintifyPlaceholder(rawCanvas, options),
		placementParams: {
			x: 0.5,
			y: 0.5,
			scale: 1,
			angle: 0,
		},
		designCoversPrintArea: true,
		isFullPrintAreaCapture: true,
		forceSourcePlacement: false,
	};
}

function getNormalizedContentBounds(
	elements = [],
	containerWidth = 0,
	containerHeight = 0
) {
	const safeWidth = Math.max(1, Number(containerWidth) || 1);
	const safeHeight = Math.max(1, Number(containerHeight) || 1);
	const combinedBounds = getCombinedElementBounds(elements);
	if (!(combinedBounds?.width > 0) || !(combinedBounds?.height > 0)) return null;
	const padX = Math.max(2, Math.round(combinedBounds.width * 0.02));
	const padY = Math.max(2, Math.round(combinedBounds.height * 0.04));
	const x = clampNumber(combinedBounds.x - padX, 0, safeWidth - 1);
	const y = clampNumber(combinedBounds.y - padY, 0, safeHeight - 1);
	const right = clampNumber(
		combinedBounds.x + combinedBounds.width + padX,
		0,
		safeWidth
	);
	const bottom = clampNumber(
		combinedBounds.y + combinedBounds.height + padY,
		0,
		safeHeight
	);
	return {
		x: x / safeWidth,
		y: y / safeHeight,
		width: Math.max(1, right - x) / safeWidth,
		height: Math.max(1, bottom - y) / safeHeight,
	};
}

function buildPodPlacementPrintAreas({
	variantId = null,
	position = "front",
	placementParams = {},
} = {}) {
	return [
		{
			variant_ids: variantId ? [variantId] : [],
			placeholders: [
				{
					position: normalizePrintAreaPosition(position || "front") || "front",
					images: [
						{
							type: "image/png",
							x: Number(placementParams?.x ?? 0.5),
							y: Number(placementParams?.y ?? 0.5),
							scale: Number(placementParams?.scale ?? 1),
							angle: Number(placementParams?.angle ?? 0),
						},
					],
				},
			],
		},
	];
}

async function convertHeicToJpegIfNeeded(file) {
	const fileType = file.type?.toLowerCase() || "";
	const fileName = file.name?.toLowerCase() || "";
	if (!fileType.includes("heic") && !fileName.endsWith(".heic")) {
		return file;
	}
	try {
		if (typeof window === "undefined") {
			return file;
		}
		const { default: heic2any } = await import("heic2any");
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
				const domtoimage = await getDomToImage();
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
	const legacySeoEnabled = useLegacySeoEnabled();
	const initialPodBootstrap = useMemo(() => {
		if (
			routeBootstrap?.type === "pod-product" &&
			routeBootstrap?.productId === productId
		) {
			return routeBootstrap;
		}
			return null;
	}, [productId, routeBootstrap]);
	const initialBootstrapProductId = initialPodBootstrap?.productId || null;
	const hasInitialBootstrapProduct = Boolean(
		initialPodBootstrap?.product && initialBootstrapProductId === productId
	);
	const initialBootstrapColor = initialPodBootstrap?.selection?.color || "";
	const initialBootstrapSize = initialPodBootstrap?.selection?.size || "";
	const initialBootstrapScent = initialPodBootstrap?.selection?.scent || "";

	useEffect(() => {
		if (typeof document === "undefined") return undefined;
		if (document.getElementById("serene-pod-fonts")) return undefined;

		const link = document.createElement("link");
		link.id = "serene-pod-fonts";
		link.rel = "stylesheet";
		link.href = POD_FONT_STYLESHEET;
		document.head.appendChild(link);

		return () => {};
	}, []);

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

	function findProductOptionValue(currentProduct, target = "", requested = "") {
		return findPodProductOptionValue(currentProduct, target, requested);
	}

	function getOptionDisplayLabel(optionValue, fallback = "") {
		return getPodOptionValueLabel(optionValue) || `${fallback || ""}`.trim();
	}

	function getVariantSelectionFallbackLabel(
		matchingVariant,
		key,
		{ sizeLabel = "", scentLabel = "" } = {}
	) {
		const parts = getVariantTitleParts(matchingVariant);
		if (!parts.length) return "";
		if (key === "size") {
			const target = normalizeVariantToken(sizeLabel);
			return parts.find((part) => normalizeVariantToken(part) === target) || "";
		}
		if (key === "scent") {
			const target = normalizeVariantToken(scentLabel);
			return parts.find((part) => normalizeVariantToken(part) === target) || "";
		}

		const blocked = new Set(
			[sizeLabel, scentLabel]
				.map((entry) => normalizeVariantToken(entry))
				.filter(Boolean)
		);
		return parts.find((part) => !blocked.has(normalizeVariantToken(part))) || parts[0];
	}

	function getReadableColorLabel(optionValue, fallback = "", matchingVariant = null, context = {}) {
		const direct = getOptionDisplayLabel(optionValue, fallback);
		if (direct && !looksLikeHexColor(direct)) {
			return direct;
		}
		const variantFallback = getVariantSelectionFallbackLabel(
			matchingVariant,
			"color",
			context
		);
		if (variantFallback && !looksLikeHexColor(variantFallback)) {
			return variantFallback;
		}
		return direct;
	}

	function resolveClosestVariantSelection(currentProduct, requested = {}) {
		if (!currentProduct?.variants?.length) {
			return {
				color: requested.color || "",
				size: requested.size || "",
				scent: requested.scent || "",
			};
		}

		const bestVariant = findMatchingPodVariant(currentProduct, requested);
		return buildPodSelectionFromVariant(currentProduct, bestVariant, {
			color: requested.color || "",
			size: requested.size || "",
			scent: requested.scent || "",
		});
	}

	const [product, setProduct] = useState(() => initialPodBootstrap?.product || null);
	const [loading, setLoading] = useState(() => !initialPodBootstrap?.product);
	const [catalogLayout, setCatalogLayout] = useState(null);
	const [catalogLayoutResolved, setCatalogLayoutResolved] = useState(false);
	const [activePrintAreaPosition, setActivePrintAreaPosition] = useState("front");
	const [visualPrintAreaFrames, setVisualPrintAreaFrames] = useState({});
	const [visualPrintAreaFrameStatus, setVisualPrintAreaFrameStatus] = useState({});

	const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

	// selected color, size, scent
	const [selectedColor, setSelectedColor] = useState(
		() => initialBootstrapColor
	);
	const [selectedSize, setSelectedSize] = useState(
		() => initialBootstrapSize
	);
	const [selectedScent, setSelectedScent] = useState(
		() => initialBootstrapScent
	);
	const effectiveOccasionStylePreset = useMemo(
		() => occasionStylePreset,
		[occasionStylePreset],
	);
	const messageApi = useMemo(
		() => ({
			success: (content) => toast.success(content),
			error: (content) => toast.error(content),
			warning: (content) => toast.warn(content),
			info: (content) => toast.info(content),
		}),
		[],
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

	function buildSelectedVariantContext(currentProduct = product) {
		const colorOpt = findProductOption(currentProduct, "color");
		const sizeOpt = findProductOption(currentProduct, "size");
		const scentOpt = findProductOption(currentProduct, "scent");
		const colorValue = findProductOptionValue(
			currentProduct,
			"color",
			selectedColor
		);
		const sizeValue = findProductOptionValue(
			currentProduct,
			"size",
			selectedSize
		);
		const scentValue = findProductOptionValue(
			currentProduct,
			"scent",
			selectedScent
		);
		const matchingVariant = findMatchingPodVariant(currentProduct, {
			variantId: order.variant_id,
			color: selectedColor,
			size: selectedSize,
			scent: selectedScent,
		});

		let finalPrice = currentProduct?.price || 0;
		let finalPriceAfterDiscount =
			currentProduct?.priceAfterDiscount || finalPrice;
		let variantImage = "";
		if (matchingVariant) {
			finalPrice = matchingVariant.price / 100;
			finalPriceAfterDiscount = finalPrice;
			const matchImg = Array.isArray(currentProduct?.images)
				? currentProduct.images.find((img) =>
						Array.isArray(img?.variant_ids)
							? img.variant_ids.includes(matchingVariant.id)
							: false
				  )
				: null;
			if (matchImg?.src) {
				variantImage = matchImg.src;
			}
		}

		const sizeLabel = getOptionDisplayLabel(sizeValue, selectedSize);
		const scentLabel = getOptionDisplayLabel(scentValue, selectedScent);
		const colorLabel = getReadableColorLabel(
			colorValue,
			selectedColor,
			matchingVariant,
			{
				sizeLabel,
				scentLabel,
			}
		);

		return {
			colorOpt,
			sizeOpt,
			scentOpt,
			colorValue,
			sizeValue,
			scentValue,
			matchingVariant,
			finalPrice,
			finalPriceAfterDiscount,
			variantImage,
			colorLabel,
			sizeLabel,
			scentLabel,
		};
	}

	const selectedVariantContext = useMemo(
		() => buildSelectedVariantContext(product),
		[order.variant_id, product, selectedColor, selectedScent, selectedSize]
	);
	const activeVariantId =
		selectedVariantContext?.matchingVariant?.id || order.variant_id || null;
	const activeCatalogVariantLayout = useMemo(() => {
		const variants = Array.isArray(catalogLayout?.variants)
			? catalogLayout.variants
			: [];
		return (
			variants.find(
				(variant) => `${variant?.id ?? ""}`.trim() === `${activeVariantId ?? ""}`.trim()
			) || variants[0] || null
		);
	}, [activeVariantId, catalogLayout]);
	const availablePrintAreaPositions = useMemo(
		() =>
			getSupportedPrintAreaPositions(
				product || {},
				activeCatalogVariantLayout ? [activeCatalogVariantLayout] : []
			),
		[activeCatalogVariantLayout, product]
	);
	const activePlaceholderLayout = useMemo(() => {
		const position = normalizePrintAreaPosition(activePrintAreaPosition || "front");
		if (!activeCatalogVariantLayout) return null;
		if (activeCatalogVariantLayout?.placeholderMap?.[position]) {
			return activeCatalogVariantLayout.placeholderMap[position];
		}
		return (
			(activeCatalogVariantLayout.placeholders || []).find(
				(placeholder) =>
					normalizePrintAreaPosition(placeholder?.position || "") === position
			) || null
		);
	}, [activeCatalogVariantLayout, activePrintAreaPosition]);
	const activePrintAreaKey = normalizePrintAreaPosition(
		activePrintAreaPosition || "front"
	);
	const activeVisualFrameKey = `${String(activeVariantId || "default")}::${activePrintAreaKey}`;
	const activeSurfaceMockupImage = useMemo(
		() => {
			if (!product) return null;
			const colorOpt = findProductOption(product, "color");
			const sourceImages = Array.isArray(product?.images) ? product.images : [];
			const sortBySurface = (images) =>
				[...(Array.isArray(images) ? images : [])].sort(
					(left, right) =>
						scoreMockupImageForSurface(right, activePrintAreaPosition, product) -
						scoreMockupImageForSurface(left, activePrintAreaPosition, product)
				);
			if (!selectedColor || !colorOpt) {
				return sortBySurface(sourceImages)[0] || null;
			}
			const colorValue = findProductOptionValue(product, "color", selectedColor);
			if (!colorValue) {
				return sortBySurface(sourceImages)[0] || null;
			}
			const matchingVariantIds = new Set(
				(product?.variants || [])
					.filter((variant) =>
						(Array.isArray(variant?.options) ? variant.options : []).some(
							(optionId) => String(optionId) === String(colorValue.id)
						)
					)
					.map((variant) => String(variant?.id || ""))
					.filter(Boolean)
			);
			const filtered = sourceImages.filter((image) =>
				(Array.isArray(image?.variant_ids) ? image.variant_ids : []).some((variantId) =>
					matchingVariantIds.has(String(variantId))
				)
			);
			return sortBySurface(filtered.length ? filtered : sourceImages)[0] || null;
		},
		[activePrintAreaPosition, product, selectedColor]
	);
	const defaultDesignReferenceImageUrls = useMemo(
		() =>
			getPodDefaultDesignReferenceImageUrls(product || {}, {
				occasion: selectedOccasion,
				color: selectedColor,
				size: selectedSize,
				scent: selectedScent,
			}),
		[product, selectedColor, selectedOccasion, selectedScent, selectedSize]
	);
	const shouldInferActiveVisualFrame = Boolean(
		supportsDynamicVisualFrameInference(product || {}, activePrintAreaPosition) &&
		activeSurfaceMockupImage?.src && defaultDesignReferenceImageUrls.length
	);
	const activeVisualFrameStatus =
		visualPrintAreaFrameStatus[activeVisualFrameKey] ||
		(shouldInferActiveVisualFrame ? "idle" : "ready");
	const activeVisualFrameOverride =
		shouldInferActiveVisualFrame
			? visualPrintAreaFrames[activeVisualFrameKey] || null
			: null;
	const basePrintAreaFrame = useMemo(
		() =>
			getPodPrintAreaFrame(
				product || {},
				activePrintAreaPosition,
				activePlaceholderLayout
			),
		[activePlaceholderLayout, activePrintAreaPosition, product],
	);
	const printAreaFrame = useMemo(
		() =>
			tunePodVisualPrintAreaFrame(
				activeVisualFrameOverride || basePrintAreaFrame,
				product || {},
				activePrintAreaPosition
			),
		[activePrintAreaPosition, activeVisualFrameOverride, basePrintAreaFrame, product]
	);
	const printifySafeInsetPercent = useMemo(
		() => getPodPrintifySafeInsetPercent(product || {}, activePrintAreaPosition),
		[activePrintAreaPosition, product],
	);
	const activeProductKind = useMemo(
		() => getPodProductKindForDefaultDesign(product || {}),
		[product]
	);
	const activeCaptureAspectRatio = useMemo(
		() => getPodPlaceholderAspectRatio(activePlaceholderLayout),
		[activePlaceholderLayout]
	);
	const activeCaptureProjection = useMemo(
		() => getPodCaptureProjection(product || {}, activePrintAreaPosition),
		[activePrintAreaPosition, product]
	);
	const printAreaHelperText = useMemo(() => {
		if (activeProductKind === "mug" && availablePrintAreaPositions.length <= 1) {
			return "Mugs use one wrap print area. Keep the design centered for the front, or use Left Side / Right Side for quick wrap placement.";
		}
		if (availablePrintAreaPositions.length > 1) {
			return "Choose the placement you want to preview and send with this order.";
		}
		return "";
	}, [activeProductKind, availablePrintAreaPositions]);
	const shouldShowMugQuickPlacements = Boolean(
		activeProductKind === "mug" &&
		availablePrintAreaPositions.length <= 1 &&
		elements.length
	);

	const [isMobile, setIsMobile] = useState(
		() => typeof window !== "undefined" && window.innerWidth < 800
	);
	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 800);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		setMugQuickPlacementPreset((prev) => (prev === "front" ? prev : "front"));
	}, [activePrintAreaPosition, activeProductKind, product?._id]);

	useEffect(() => {
		const normalizedSearch = normalizeSearchParamsString(location.search);
		if (lastAppliedPersonalizationSearchRef.current === normalizedSearch) {
			return;
		}
		lastAppliedPersonalizationSearchRef.current = normalizedSearch;
		if (lastRequestedPersonalizationSearchRef.current === normalizedSearch) {
			lastRequestedPersonalizationSearchRef.current = "";
		}
		const resolved = resolvePodPersonalization(location.search);
		setSelectedOccasion((prev) =>
			prev === resolved.occasion ? prev : resolved.occasion
		);
		setSelectedGiftName((prev) => (prev === resolved.name ? prev : resolved.name));
		savePodPersonalization(resolved);
	}, [location.search]);

	useEffect(() => {
		// Keep text-tool defaults aligned with the selected occasion preset.
		setTextColor((prev) =>
			prev === effectiveOccasionStylePreset.textColor
				? prev
				: effectiveOccasionStylePreset.textColor
		);
		setFontFamily((prev) =>
			prev === effectiveOccasionStylePreset.fontFamily
				? prev
				: effectiveOccasionStylePreset.fontFamily
		);
		setFontSize((prev) =>
			prev === effectiveOccasionStylePreset.fontSize
				? prev
				: effectiveOccasionStylePreset.fontSize
		);
		setFontWeight((prev) =>
			prev === effectiveOccasionStylePreset.fontWeight
				? prev
				: effectiveOccasionStylePreset.fontWeight
		);
		setFontStyle((prev) =>
			prev === effectiveOccasionStylePreset.fontStyle
				? prev
				: effectiveOccasionStylePreset.fontStyle
		);
		setBorderRadius((prev) =>
			prev === effectiveOccasionStylePreset.borderRadius
				? prev
				: effectiveOccasionStylePreset.borderRadius
		);
	}, [effectiveOccasionStylePreset]);

	const { addToCart, openSidebar2 } = useCartContext();
	const auth = isAuthenticated() || {};
	const user = auth.user || null;
	const token = auth.token || "";

	// fallback user ID / token
	const fallbackUserId = user?._id || "663539b4eb1a090ebd349d65";
	const fallbackToken = token || "token";

	// Refs for screenshot
	const sliderRef = useRef(null);
	const designOverlayRef = useRef(null);
	const bareDesignRef = useRef(null);
	const printAreaRef = useRef(null);
	const barePrintAreaRef = useRef(null);
	const elementsRef = useRef([]);
	const surfaceDraftsRef = useRef({});
	const activePrintAreaRef = useRef("front");
	const autoGeneratedSnapshotRef = useRef({});
	const autoGeneratedLayoutSignatureRef = useRef({});
	const refinedVisualFrameKeysRef = useRef({});
	const lastAppliedPersonalizationSearchRef = useRef("");
	const lastRequestedPersonalizationSearchRef = useRef("");

	// For mobile text modal
	const [textModalVisible, setTextModalVisible] = useState(false);
	const [mobileTextInput, setMobileTextInput] = useState("");
	const [mugQuickPlacementPreset, setMugQuickPlacementPreset] = useState("front");

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
		surfaceDraftsRef.current = {};
		activePrintAreaRef.current = "front";
		autoGeneratedSnapshotRef.current = {};
		autoGeneratedLayoutSignatureRef.current = {};
		refinedVisualFrameKeysRef.current = {};
		setElements([]);
		setSelectedElementId(null);
		setInlineEditId(null);
		setInlineEditText("");
		setDefaultTextAdded(false);
		setIsDescriptionExpanded(false);
		setHasChangedSizeOrColor(false);
		setCatalogLayout(null);
		setCatalogLayoutResolved(false);
		setActivePrintAreaPosition("front");
		setVisualPrintAreaFrames({});
		setVisualPrintAreaFrameStatus({});
		setSelectedColor(initialBootstrapColor);
		setSelectedSize(initialBootstrapSize);
		setSelectedScent(initialBootstrapScent);
		setOrder((prev) => ({
			...prev,
			product_id: productId || null,
			variant_id: null,
			customizations: { texts: [], images: [] },
		}));
	}, [productId]);

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
				messageApi.error("Product not found or no data returned.");
				setLoading(false);
				return false;
			}
			if (!normalizedProduct.variants.length) {
				messageApi.error("No valid variants with pricing were found.");
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

		if (hasInitialBootstrapProduct) {
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
					messageApi.error("Product not found or no data returned.");
					setLoading(false);
					return;
				}
				applyResolvedProduct(response.data);
			} catch (err) {
				console.error(err);
				messageApi.error("Failed to load product details.");
				setLoading(false);
			}
		};
		fetchProduct();
		return () => {
			isActive = false;
		};
	}, [hasInitialBootstrapProduct, history, productId, productSlug]);

	useEffect(() => {
		let cancelled = false;
		if (!product?._id || !product?.printifyProductDetails?.POD) {
			setCatalogLayout(null);
			setCatalogLayoutResolved(true);
			return undefined;
		}
		setCatalogLayoutResolved(false);

		const fetchCatalogLayout = async () => {
			try {
				const response = await axios.get(
					`${process.env.REACT_APP_API_URL}/pod/layout/${product._id}`
				);
				if (!cancelled) {
					setCatalogLayout(response?.data || null);
				}
			} catch (error) {
				console.warn("Failed loading POD layout metadata:", error);
				if (!cancelled) {
					setCatalogLayout(null);
				}
			} finally {
				if (!cancelled) {
					setCatalogLayoutResolved(true);
				}
			}
		};

		fetchCatalogLayout();
		return () => {
			cancelled = true;
		};
	}, [product?._id, product?.printifyProductDetails?.POD]);

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

	useEffect(() => {
		if (!availablePrintAreaPositions.length) return;
		if (!availablePrintAreaPositions.includes(activePrintAreaPosition)) {
			setActivePrintAreaPosition(
				availablePrintAreaPositions.includes("front")
					? "front"
					: availablePrintAreaPositions[0]
			);
		}
	}, [activePrintAreaPosition, availablePrintAreaPositions]);

	useEffect(() => {
		elementsRef.current = elements;
		if (!activePrintAreaRef.current) return;
		surfaceDraftsRef.current[activePrintAreaRef.current] = elements.map((element) => ({
			...element,
		}));
	}, [elements]);

	useEffect(() => {
		if (!activePrintAreaPosition) return;
		const previousPosition = activePrintAreaRef.current;
		if (previousPosition && previousPosition !== activePrintAreaPosition) {
			surfaceDraftsRef.current[previousPosition] = elements.map((element) => ({
				...element,
			}));
		}
		activePrintAreaRef.current = activePrintAreaPosition;
		const draft = surfaceDraftsRef.current[activePrintAreaPosition];
		const nextElements = Array.isArray(draft)
			? draft.map((element) => ({ ...element }))
			: [];
		setElements((prev) => {
			const prevComparable = JSON.stringify(prev);
			const nextComparable = JSON.stringify(nextElements);
			return prevComparable === nextComparable ? prev : nextElements;
		});
		setSelectedElementId(null);
		setInlineEditId(null);
		setInlineEditText("");
		setDefaultTextAdded((prev) =>
			prev === (nextElements.length > 0) ? prev : nextElements.length > 0
		);
	}, [activePrintAreaPosition]);

	function rememberAutoGeneratedSnapshot(
		positionInput = activePrintAreaPosition,
		elementsInput = []
	) {
		const position = normalizePrintAreaPosition(positionInput || "front");
		autoGeneratedSnapshotRef.current[position] = JSON.stringify(
			Array.isArray(elementsInput) ? elementsInput : []
		);
	}

	function buildAutoGeneratedDesignDrafts({
		messageId = Date.now(),
		iconId = messageId + 1,
		boundsWidth = 0,
		boundsHeight = 0,
	} = {}) {
		if (!product) return null;
		const hasExplicitBounds =
			Number(boundsWidth) > 0 && Number(boundsHeight) > 0;
		const boundingRect = hasExplicitBounds
			? {
					width: Number(boundsWidth),
					height: Number(boundsHeight),
			  }
			: printAreaRef.current
				? printAreaRef.current.getBoundingClientRect()
				: null;
		if (!(boundingRect?.width > 0) || !(boundingRect?.height > 0)) return null;
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
			effectiveOccasionStylePreset
		);
		const isBagDesign = geometry.kind === "bag";
		const isToteDesign = geometry.kind === "tote";
		const isPillowDesign = geometry.kind === "pillow";
		const isMagnetDesign = geometry.kind === "magnet";
		const isCandleDesign = geometry.kind === "candle";
		const toteMessageFontFactor = isToteDesign
			? isMobile
				? 0.335
				: 0.345
			: 0.36;
		const toteMessageFontMin = isToteDesign ? (isMobile ? 18 : 20) : 16;
		const toteMessageFontMax = isToteDesign ? (isMobile ? 34 : 40) : 28;
		const toteIconFontFactor = isToteDesign ? (isMobile ? 0.62 : 0.66) : 0.54;
		const toteIconFontMin = isToteDesign ? (isMobile ? 18 : 20) : 18;
		const toteIconFontMax = isToteDesign ? (isMobile ? 28 : 34) : 30;
		const pillowMessageFontFactor = isPillowDesign
			? isMobile
				? 0.176
				: 0.188
			: 0.36;
		const pillowMessageFontMin = isPillowDesign ? (isMobile ? 18 : 20) : 16;
		const pillowMessageFontMax = isPillowDesign ? (isMobile ? 32 : 40) : 28;
		const pillowIconFontFactor = isPillowDesign
			? isMobile
				? 0.58
				: 0.64
			: 0.54;
		const pillowIconFontMin = isPillowDesign ? (isMobile ? 18 : 20) : 18;
		const pillowIconFontMax = isPillowDesign ? (isMobile ? 28 : 32) : 30;
		const magnetMessageFontFactor = isMagnetDesign
			? isMobile
				? 0.29
				: 0.305
			: 0.36;
		const magnetMessageFontMin = isMagnetDesign ? (isMobile ? 18 : 20) : 16;
		const magnetMessageFontMax = isMagnetDesign ? (isMobile ? 40 : 52) : 28;
		const magnetIconFontFactor = isMagnetDesign
			? isMobile
				? 0.66
				: 0.72
			: 0.54;
		const magnetIconFontMin = isMagnetDesign ? (isMobile ? 18 : 20) : 18;
		const magnetIconFontMax = isMagnetDesign ? (isMobile ? 32 : 40) : 30;
		const bagWidthBoost = isBagDesign ? (isMobile ? 1.04 : 1) : 1;
		const bagHeightBoost = isBagDesign ? (isMobile ? 1.06 : 1) : 1;
		const bagIconBoost = isBagDesign ? (isMobile ? 1.04 : 1) : 1;
		const candleMessageFontFactor = isCandleDesign
			? isMobile
				? 0.215
				: 0.235
			: 0.36;
		const candleMessageFontMin = isCandleDesign ? (isMobile ? 16 : 20) : 16;
		const candleMessageFontMax = isCandleDesign ? (isMobile ? 42 : 52) : 28;
		const candleIconFontFactor = isCandleDesign ? (isMobile ? 0.64 : 0.7) : 0.54;
		const candleIconFontMin = isCandleDesign ? (isMobile ? 15 : 18) : 18;
		const candleIconFontMax = isCandleDesign ? (isMobile ? 28 : 34) : 30;
		const widthCapRatio = isBagDesign
			? isMobile
				? 0.88
				: 0.84
			: isToteDesign
				? isMobile
					? 0.84
					: 0.86
			: isPillowDesign
				? isMobile
					? 0.9
					: 0.95
			: isMagnetDesign
				? isMobile
					? 0.92
					: 0.95
			: isCandleDesign
				? isMobile
					? 0.88
					: 0.98
				: 0.8;
		const minMessageWidth = isBagDesign
			? 150
			: isToteDesign
				? isMobile
					? 174
					: 212
			: isPillowDesign
				? isMobile
					? 176
					: 270
			: isMagnetDesign
				? isMobile
					? 184
					: 258
			: isCandleDesign
				? isMobile
					? 154
					: 304
				: 124;
		const minMessageHeight = isBagDesign
			? 56
			: isToteDesign
				? isMobile
					? 88
					: 104
			: isPillowDesign
				? isMobile
					? 118
					: 170
			: isMagnetDesign
				? isMobile
					? 126
					: 176
			: isCandleDesign
				? isMobile
					? 154
					: 282
				: 48;
		const minIconSize = isBagDesign
			? 28
			: isToteDesign
				? isMobile
					? 28
					: 34
			: isPillowDesign
				? isMobile
					? 28
					: 34
			: isMagnetDesign
				? isMobile
					? 32
					: 40
			: isCandleDesign
				? isMobile
					? 20
					: 28
				: 24;
		let messageWidth = Math.min(
			Math.round(safeWidth * widthCapRatio),
			Math.max(
				minMessageWidth,
				Math.round(safeWidth * geometry.messageWidthRatio * bagWidthBoost)
			)
		);
		let messageHeight = Math.min(
			geometry.maxMessageHeight || 86,
			Math.max(
				minMessageHeight,
				Math.round(safeHeight * geometry.messageHeightRatio * bagHeightBoost)
			)
		);
		let iconSize = Math.min(
			geometry.maxIconSize || 44,
			Math.max(
				minIconSize,
				Math.round(safeWidth * geometry.iconSizeRatio * bagIconBoost)
			)
		);
		const messageX = safeStartX + Math.round((safeWidth - messageWidth) / 2);
		const iconX = safeStartX + Math.round((safeWidth - iconSize) / 2);
		const minMessageY = isPillowDesign
			? safeStartY
			: safeStartY + Math.max(0, iconSize - geometry.iconOverlapPx);
		const maxMessageY = safeStartY + safeHeight - messageHeight;
		const messageY = clampNumber(
			Math.round(safeStartY + (safeHeight - messageHeight) / 2),
			minMessageY,
			Math.max(minMessageY, maxMessageY)
		);
		const iconY = clampNumber(
			isCandleDesign
				? messageY + Math.round(messageHeight * (isMobile ? 0.14 : 0.145))
				: isPillowDesign
					? messageY + Math.round(messageHeight * (isMobile ? 0.16 : 0.155))
				: isMagnetDesign
					? messageY + Math.round(messageHeight * (isMobile ? 0.205 : 0.195))
				: messageY - iconSize + geometry.iconOverlapPx,
			safeStartY,
			safeStartY + safeHeight - iconSize
		);
		const messageFontSize = clampNumber(
			Math.round(
				messageHeight *
					(isBagDesign
						? isMobile
							? 0.44
							: 0.4
						: isToteDesign
							? toteMessageFontFactor
						: isPillowDesign
							? pillowMessageFontFactor
						: isMagnetDesign
							? magnetMessageFontFactor
						: isCandleDesign
							? candleMessageFontFactor
							: 0.36)
			),
			isBagDesign
				? 18
				: isToteDesign
					? toteMessageFontMin
					: isPillowDesign
						? pillowMessageFontMin
					: isMagnetDesign
						? magnetMessageFontMin
						: candleMessageFontMin,
			isBagDesign
				? isMobile
					? 32
					: 30
				: isToteDesign
					? toteMessageFontMax
					: isPillowDesign
						? pillowMessageFontMax
					: isMagnetDesign
						? magnetMessageFontMax
					: candleMessageFontMax
		);
		const iconFontSize = clampNumber(
			Math.round(
				iconSize *
					(isToteDesign
						? toteIconFontFactor
						: isPillowDesign
							? pillowIconFontFactor
						: isMagnetDesign
							? magnetIconFontFactor
							: candleIconFontFactor)
			),
			isToteDesign
				? toteIconFontMin
				: isPillowDesign
					? pillowIconFontMin
				: isMagnetDesign
					? magnetIconFontMin
					: candleIconFontMin,
			isToteDesign
				? toteIconFontMax
				: isPillowDesign
					? pillowIconFontMax
				: isMagnetDesign
					? magnetIconFontMax
					: candleIconFontMax
		);
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

		return {
			message: {
				id: messageId,
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
				borderRadius: isCandleDesign
					? isMobile
						? 22
						: 30
					: isPillowDesign
						? isMobile
							? 22
							: 26
					: isMagnetDesign
						? isMobile
							? 18
							: 22
					: effectiveOccasionStylePreset.borderRadius,
				borderColor:
					effectiveOccasionStylePreset.messageBorderColor ||
					effectiveOccasionStylePreset.accentBorderColor ||
					"rgba(31, 41, 55, 0.2)",
				borderWidth: clampNumber(
					Number(effectiveOccasionStylePreset.messageBorderWidth) || 2,
					1,
					4
				),
				boxShadow:
					effectiveOccasionStylePreset.messageShadow ||
					"0 6px 16px rgba(16, 33, 24, 0.12)",
				lineHeight: isCandleDesign
					? 0.96
					: isPillowDesign
						? 1.01
						: isMagnetDesign
							? 1.01
							: 1.08,
				paddingX: clampNumber(
					isBagDesign
						? Math.round(messageWidth * (isMobile ? 0.042 : 0.045))
						: isToteDesign
							? Math.round(messageWidth * (isMobile ? 0.042 : 0.046))
						: isPillowDesign
							? Math.round(messageWidth * (isMobile ? 0.026 : 0.03))
						: isMagnetDesign
							? Math.round(messageWidth * (isMobile ? 0.024 : 0.028))
						: isCandleDesign
							? Math.round(messageWidth * (isMobile ? 0.026 : 0.034))
						: Number(effectiveOccasionStylePreset.paddingX) ||
							Math.round(messageWidth * 0.055),
						isBagDesign
							? 9
							: isToteDesign
								? (isMobile ? 8 : 10)
							: isPillowDesign
								? (isMobile ? 8 : 10)
							: isMagnetDesign
								? (isMobile ? 6 : 8)
							: isCandleDesign
								? (isMobile ? 6 : 10)
								: 8,
						isBagDesign
							? 16
							: isToteDesign
								? (isMobile ? 16 : 20)
							: isPillowDesign
								? (isMobile ? 12 : 16)
							: isMagnetDesign
								? (isMobile ? 12 : 14)
							: isCandleDesign
								? (isMobile ? 12 : 18)
								: 20
				),
				paddingY: clampNumber(
					isBagDesign
						? Math.round(messageHeight * 0.08)
						: isToteDesign
							? Math.round(messageHeight * (isMobile ? 0.085 : 0.09))
						: isPillowDesign
							? Math.round(messageHeight * (isMobile ? 0.044 : 0.05))
						: isMagnetDesign
							? Math.round(messageHeight * (isMobile ? 0.038 : 0.044))
						: isCandleDesign
							? Math.round(messageHeight * (isMobile ? 0.036 : 0.05))
						: Number(effectiveOccasionStylePreset.paddingY) ||
							Math.round(messageHeight * 0.09),
						isBagDesign
							? 4
							: isToteDesign
								? (isMobile ? 6 : 8)
							: isPillowDesign
								? (isMobile ? 6 : 8)
							: isMagnetDesign
								? (isMobile ? 4 : 6)
							: isCandleDesign
								? (isMobile ? 5 : 8)
								: 4,
						isBagDesign
							? 8
							: isToteDesign
								? (isMobile ? 12 : 16)
							: isPillowDesign
								? (isMobile ? 9 : 12)
							: isMagnetDesign
								? (isMobile ? 10 : 12)
							: isCandleDesign
								? (isMobile ? 10 : 14)
								: 10
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
			},
			icon: {
				id: iconId,
				type: "text",
				text:
					effectiveOccasionStylePreset.accentIcon || selectedOccasionMeta.icon,
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
					3
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
			},
		};
	}

	useEffect(() => {
		if (!catalogLayoutResolved || !product || !activePrintAreaKey) return undefined;
		if (!shouldInferActiveVisualFrame) {
			return undefined;
		}
		if (visualPrintAreaFrames[activeVisualFrameKey]) {
			if (visualPrintAreaFrameStatus[activeVisualFrameKey] === "ready") {
				return undefined;
			}
			setVisualPrintAreaFrameStatus((prev) => ({
				...prev,
				[activeVisualFrameKey]: "ready",
			}));
			return undefined;
		}
		if (
			visualPrintAreaFrameStatus[activeVisualFrameKey] === "ready" ||
			visualPrintAreaFrameStatus[activeVisualFrameKey] === "failed"
		) {
			return undefined;
		}

		let cancelled = false;
		let frameId = null;
		let nestedFrameId = null;

		const failInference = () => {
			if (cancelled) return;
			setVisualPrintAreaFrameStatus((prev) => {
				if (prev[activeVisualFrameKey] === "failed") return prev;
				return {
					...prev,
					[activeVisualFrameKey]: "failed",
				};
			});
		};

		const runInference = async () => {
			const overlayRect = designOverlayRef.current?.getBoundingClientRect();
			if (!(overlayRect?.width > 0) || !(overlayRect?.height > 0)) {
				frameId = window.requestAnimationFrame(() => {
					nestedFrameId = window.requestAnimationFrame(() => {
						void runInference();
					});
				});
				return;
			}

			const baseFrameRect = buildFramePixelRectFromPercent(
				basePrintAreaFrame,
				overlayRect.width,
				overlayRect.height
			);
			if (!(baseFrameRect.width > 0) || !(baseFrameRect.height > 0)) {
				failInference();
				return;
			}

			const drafts = buildAutoGeneratedDesignDrafts({
				messageId: 1,
				iconId: 2,
				boundsWidth: baseFrameRect.width,
				boundsHeight: baseFrameRect.height,
			});
			const draftBounds = drafts
				? getCombinedElementBounds([drafts.message, drafts.icon])
				: null;
			if (!(draftBounds?.width > 0) || !(draftBounds?.height > 0)) {
				failInference();
				return;
			}

			try {
				const inferredFrame = await inferDynamicPrintAreaFrameFromReferenceImages({
					baseImageSrc: activeSurfaceMockupImage?.src || "",
					referenceImageUrls: defaultDesignReferenceImageUrls,
					containerWidth: overlayRect.width,
					containerHeight: overlayRect.height,
					relativeDesignBounds: {
						x: draftBounds.x / baseFrameRect.width,
						y: draftBounds.y / baseFrameRect.height,
						width: draftBounds.width / baseFrameRect.width,
						height: draftBounds.height / baseFrameRect.height,
					},
				});
				if (cancelled) return;
				if (!inferredFrame) {
					failInference();
					return;
				}
				setVisualPrintAreaFrames((prev) => ({
					...prev,
					[activeVisualFrameKey]: inferredFrame,
				}));
				setVisualPrintAreaFrameStatus((prev) => ({
					...prev,
					[activeVisualFrameKey]: "ready",
				}));
			} catch (error) {
				console.warn("Failed inferring POD print-area frame from reference images:", {
					productId: product?._id || null,
					variantId: activeVariantId || null,
					position: activePrintAreaKey,
					message: error?.message || "Unknown error",
				});
				failInference();
			}
		};

		if (visualPrintAreaFrameStatus[activeVisualFrameKey] !== "pending") {
			setVisualPrintAreaFrameStatus((prev) => ({
				...prev,
				[activeVisualFrameKey]: "pending",
			}));
		}
		frameId = window.requestAnimationFrame(() => {
			nestedFrameId = window.requestAnimationFrame(() => {
				void runInference();
			});
		});

		return () => {
			cancelled = true;
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			if (nestedFrameId) {
				window.cancelAnimationFrame(nestedFrameId);
			}
		};
	}, [
		activePrintAreaKey,
		activeSurfaceMockupImage,
		activeVariantId,
		activeVisualFrameKey,
		basePrintAreaFrame,
		catalogLayoutResolved,
		defaultDesignReferenceImageUrls,
		printifySafeInsetPercent,
		product,
		shouldInferActiveVisualFrame,
		visualPrintAreaFrames,
		visualPrintAreaFrameStatus,
	]);

	/**
	 * 2) Add a default text box in the middle
	 */
	useEffect(() => {
		if (!catalogLayoutResolved || !product || defaultTextAdded) return;
		if (
			shouldInferActiveVisualFrame &&
			!["ready", "failed"].includes(activeVisualFrameStatus)
		) {
			return;
		}

		let frameId = null;
		let nestedFrameId = null;
		const applyDefaultDrafts = () => {
			const drafts = buildAutoGeneratedDesignDrafts();
			if (!drafts) return;
			const next = [drafts.message, drafts.icon];
			rememberAutoGeneratedSnapshot(activePrintAreaPosition, next);
			setElements((prev) => {
				const prevComparable = JSON.stringify(prev);
				const nextComparable = JSON.stringify(next);
				return prevComparable === nextComparable ? prev : next;
			});
			setSelectedElementId(null);
			setDefaultTextAdded((prev) => (prev ? prev : true));
		};

		if (typeof window === "undefined") {
			applyDefaultDrafts();
			return undefined;
		}
		frameId = window.requestAnimationFrame(() => {
			nestedFrameId = window.requestAnimationFrame(() => {
				applyDefaultDrafts();
			});
		});

		return () => {
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			if (nestedFrameId) {
				window.cancelAnimationFrame(nestedFrameId);
			}
		};
	}, [
		activeVisualFrameStatus,
		activePrintAreaPosition,
		catalogLayoutResolved,
		defaultTextAdded,
		effectiveOccasionStylePreset,
		printAreaFrame,
		product,
		selectedGiftName,
		selectedOccasionMeta.icon,
		selectedOccasion,
		printifySafeInsetPercent,
		shouldInferActiveVisualFrame,
	]);

	useEffect(() => {
		if (
			!catalogLayoutResolved ||
			!product ||
			!defaultTextAdded ||
			activeVisualFrameStatus !== "ready" ||
			!activeVisualFrameOverride ||
			refinedVisualFrameKeysRef.current[activeVisualFrameKey]
		) {
			return undefined;
		}
		if (!elements.length || !elements.every((item) => item.isAutoGenerated)) {
			return undefined;
		}
		if (!shouldInferActiveVisualFrame) {
			refinedVisualFrameKeysRef.current[activeVisualFrameKey] = true;
			return undefined;
		}

		let cancelled = false;
		let frameId = null;

		const refineFrame = async () => {
			const overlayRect = designOverlayRef.current?.getBoundingClientRect();
			const printAreaRect = printAreaRef.current?.getBoundingClientRect();
			if (
				!(overlayRect?.width > 0) ||
				!(overlayRect?.height > 0) ||
				!(printAreaRect?.width > 0) ||
				!(printAreaRect?.height > 0)
			) {
				frameId = window.requestAnimationFrame(() => {
					void refineFrame();
				});
				return;
			}

			const combinedBounds = getCombinedElementBounds(elements);
			if (!(combinedBounds?.width > 0) || !(combinedBounds?.height > 0)) {
				refinedVisualFrameKeysRef.current[activeVisualFrameKey] = true;
				return;
			}

			try {
				const refinedFrame = await inferDynamicPrintAreaFrameFromReferenceImages({
					baseImageSrc: activeSurfaceMockupImage?.src || "",
					referenceImageUrls: defaultDesignReferenceImageUrls,
					containerWidth: overlayRect.width,
					containerHeight: overlayRect.height,
					relativeDesignBounds: {
						x: combinedBounds.x / printAreaRect.width,
						y: combinedBounds.y / printAreaRect.height,
						width: combinedBounds.width / printAreaRect.width,
						height: combinedBounds.height / printAreaRect.height,
					},
				});
				if (cancelled) return;
				refinedVisualFrameKeysRef.current[activeVisualFrameKey] = true;
				if (!refinedFrame) return;
				if (getFrameDifferenceScore(refinedFrame, activeVisualFrameOverride) < 1.5) {
					return;
				}

				const tunedRefinedFrame = tunePodVisualPrintAreaFrame(
					refinedFrame,
					product || {},
					activePrintAreaPosition
				);
				const refinedFrameRect = buildFramePixelRectFromPercent(
					tunedRefinedFrame,
					overlayRect.width,
					overlayRect.height
				);
				if (!(refinedFrameRect.width > 0) || !(refinedFrameRect.height > 0)) {
					return;
				}

				const currentIds = elements.reduce((accumulator, item) => {
					if (item.autoKind === "message") accumulator.messageId = item.id;
					if (item.autoKind === "icon") accumulator.iconId = item.id;
					return accumulator;
				}, {});
				const drafts = buildAutoGeneratedDesignDrafts({
					messageId: currentIds.messageId || Date.now(),
					iconId: currentIds.iconId || Date.now() + 1,
					boundsWidth: refinedFrameRect.width,
					boundsHeight: refinedFrameRect.height,
				});
				if (!drafts) return;
				const next = [drafts.message, drafts.icon];
				rememberAutoGeneratedSnapshot(activePrintAreaPosition, next);
				setVisualPrintAreaFrames((prev) => {
					const currentFrame = prev[activeVisualFrameKey];
					if (
						currentFrame &&
						JSON.stringify(currentFrame) === JSON.stringify(refinedFrame)
					) {
						return prev;
					}
					return {
						...prev,
						[activeVisualFrameKey]: refinedFrame,
					};
				});
				setElements((prev) => {
					const prevComparable = JSON.stringify(prev);
					const nextComparable = JSON.stringify(next);
					return prevComparable === nextComparable ? prev : next;
				});
			} catch (error) {
				console.warn("Failed refining POD visual frame:", {
					productId: product?._id || null,
					variantId: activeVariantId || null,
					position: activePrintAreaKey,
					message: error?.message || "Unknown error",
				});
				refinedVisualFrameKeysRef.current[activeVisualFrameKey] = true;
			}
		};

		frameId = window.requestAnimationFrame(() => {
			void refineFrame();
		});

		return () => {
			cancelled = true;
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
		};
	}, [
		activePrintAreaKey,
		activePrintAreaPosition,
		activeSurfaceMockupImage,
		activeVariantId,
		activeVisualFrameKey,
		activeVisualFrameOverride,
		activeVisualFrameStatus,
		catalogLayoutResolved,
		defaultDesignReferenceImageUrls,
		defaultTextAdded,
		elements,
		product,
		shouldInferActiveVisualFrame,
	]);

	useEffect(() => {
		if (!catalogLayoutResolved || !product || !defaultTextAdded) return;
		const position = normalizePrintAreaPosition(activePrintAreaPosition || "front");
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
		const productKind = getPodProductKindForDefaultDesign(product || {});
		const isBagAutoDesign = productKind === "bag";
		const isToteAutoDesign = productKind === "tote";
		const isPillowAutoDesign = productKind === "pillow";
		const isMagnetAutoDesign = productKind === "magnet";
		const isCandleAutoDesign = productKind === "candle";
		const toteMessageFontFactor = isToteAutoDesign
			? isMobile
				? 0.335
				: 0.345
			: 0.36;
		const toteMessageFontMin = isToteAutoDesign ? (isMobile ? 18 : 20) : 16;
		const toteMessageFontMax = isToteAutoDesign ? (isMobile ? 34 : 40) : 28;
		const toteIconFontFactor = isToteAutoDesign
			? isMobile
				? 0.62
				: 0.66
			: 0.54;
		const toteIconFontMin = isToteAutoDesign ? (isMobile ? 18 : 20) : 18;
		const toteIconFontMax = isToteAutoDesign ? (isMobile ? 28 : 34) : 30;
		const pillowMessageFontFactor = isPillowAutoDesign
			? isMobile
				? 0.176
				: 0.188
			: 0.36;
		const pillowMessageFontMin = isPillowAutoDesign ? (isMobile ? 18 : 20) : 16;
		const pillowMessageFontMax = isPillowAutoDesign ? (isMobile ? 32 : 40) : 28;
		const pillowIconFontFactor = isPillowAutoDesign
			? isMobile
				? 0.58
				: 0.64
			: 0.54;
		const pillowIconFontMin = isPillowAutoDesign ? (isMobile ? 18 : 20) : 18;
		const pillowIconFontMax = isPillowAutoDesign ? (isMobile ? 28 : 32) : 30;
		const magnetMessageFontFactor = isMagnetAutoDesign
			? isMobile
				? 0.29
				: 0.305
			: 0.36;
		const magnetMessageFontMin = isMagnetAutoDesign ? (isMobile ? 18 : 20) : 16;
		const magnetMessageFontMax = isMagnetAutoDesign ? (isMobile ? 40 : 52) : 28;
		const magnetIconFontFactor = isMagnetAutoDesign
			? isMobile
				? 0.66
				: 0.72
			: 0.54;
		const magnetIconFontMin = isMagnetAutoDesign ? (isMobile ? 18 : 20) : 18;
		const magnetIconFontMax = isMagnetAutoDesign ? (isMobile ? 32 : 40) : 30;
		const candleMessageFontFactor = isCandleAutoDesign
			? isMobile
				? 0.215
				: 0.235
			: 0.36;
		const candleMessageFontMin = isCandleAutoDesign ? (isMobile ? 16 : 20) : 16;
		const candleMessageFontMax = isCandleAutoDesign ? (isMobile ? 42 : 52) : 28;
		const candleIconFontFactor = isCandleAutoDesign
			? isMobile
				? 0.64
				: 0.7
			: 0.54;
		const candleIconFontMin = isCandleAutoDesign ? (isMobile ? 15 : 18) : 18;
		const candleIconFontMax = isCandleAutoDesign ? (isMobile ? 28 : 34) : 30;
		setElements((prev) => {
			if (!prev.length || !prev.every((item) => item.isAutoGenerated)) {
				return prev;
			}
			const currentComparable = JSON.stringify(prev);
			const lastAutoSnapshot = autoGeneratedSnapshotRef.current[position];
			if (lastAutoSnapshot && currentComparable !== lastAutoSnapshot) {
				return prev;
			}
			const next = prev.map((item) => {
				if (item.type !== "text" || !item.isAutoGenerated) return item;
				if (item.autoKind === "icon") {
					return {
						...item,
						text: autoIcon,
						color: effectiveOccasionStylePreset.accentTextColor,
						backgroundColor: effectiveOccasionStylePreset.accentBackgroundColor,
						backgroundImage: `linear-gradient(145deg, ${iconGradientStart} 0%, ${iconGradientEnd} 100%)`,
						fontFamily: effectiveOccasionStylePreset.fontFamily,
						fontSize: clampNumber(
							Math.round(
								(item.height || 36) *
									(isToteAutoDesign
										? toteIconFontFactor
										: isPillowAutoDesign
											? pillowIconFontFactor
										: isMagnetAutoDesign
											? magnetIconFontFactor
										: candleIconFontFactor)
							),
							isToteAutoDesign
								? toteIconFontMin
								: isPillowAutoDesign
									? pillowIconFontMin
								: isMagnetAutoDesign
									? magnetIconFontMin
									: candleIconFontMin,
							isToteAutoDesign
								? toteIconFontMax
								: isPillowAutoDesign
									? pillowIconFontMax
								: isMagnetAutoDesign
									? magnetIconFontMax
									: candleIconFontMax
						),
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
							3
						),
						boxShadow:
							effectiveOccasionStylePreset.accentShadow ||
							"0 5px 13px rgba(16, 33, 24, 0.1)",
						paddingX: 1,
						paddingY: 1,
						lineHeight: 1,
					};
				}
				return {
					...item,
					text: autoMessage,
					color: effectiveOccasionStylePreset.textColor,
					backgroundColor: effectiveOccasionStylePreset.backgroundColor,
					backgroundImage: `linear-gradient(140deg, ${messageGradientStart} 0%, ${messageGradientEnd} 100%)`,
					fontFamily: effectiveOccasionStylePreset.fontFamily,
					fontSize: clampNumber(
						Math.round(
							(item.height || 56) *
								(isBagAutoDesign
									? isMobile
										? 0.44
										: 0.4
									: isToteAutoDesign
										? toteMessageFontFactor
									: isPillowAutoDesign
										? pillowMessageFontFactor
									: isMagnetAutoDesign
										? magnetMessageFontFactor
									: isCandleAutoDesign
										? candleMessageFontFactor
										: 0.36)
						),
						isBagAutoDesign
							? 18
							: isToteAutoDesign
								? toteMessageFontMin
								: isPillowAutoDesign
									? pillowMessageFontMin
								: isMagnetAutoDesign
									? magnetMessageFontMin
								: candleMessageFontMin,
						isBagAutoDesign
							? isMobile
								? 32
								: 30
							: isToteAutoDesign
								? toteMessageFontMax
								: isPillowAutoDesign
									? pillowMessageFontMax
								: isMagnetAutoDesign
									? magnetMessageFontMax
								: candleMessageFontMax
					),
					fontWeight: effectiveOccasionStylePreset.fontWeight,
					fontStyle: effectiveOccasionStylePreset.fontStyle,
					letterSpacing: effectiveOccasionStylePreset.letterSpacing || "0.08px",
					textShadow:
						effectiveOccasionStylePreset.textShadow ||
						"0 1px 2px rgba(16, 33, 24, 0.16)",
					borderRadius: isCandleAutoDesign
						? isMobile
							? 22
							: 30
						: isPillowAutoDesign
							? isMobile
								? 22
								: 26
						: isMagnetAutoDesign
							? isMobile
								? 18
								: 22
						: effectiveOccasionStylePreset.borderRadius,
					borderColor:
						effectiveOccasionStylePreset.messageBorderColor ||
						effectiveOccasionStylePreset.accentBorderColor ||
						"rgba(31, 41, 55, 0.2)",
					borderWidth: clampNumber(
						Number(effectiveOccasionStylePreset.messageBorderWidth) || 2,
						1,
						4
					),
					boxShadow:
						effectiveOccasionStylePreset.messageShadow ||
						"0 6px 16px rgba(16, 33, 24, 0.12)",
					paddingX: clampNumber(
						isBagAutoDesign
							? Math.round((item.width || 180) * (isMobile ? 0.042 : 0.045))
							: isToteAutoDesign
								? Math.round((item.width || 180) * (isMobile ? 0.042 : 0.046))
							: isPillowAutoDesign
								? Math.round((item.width || 180) * (isMobile ? 0.026 : 0.03))
							: isMagnetAutoDesign
								? Math.round((item.width || 180) * (isMobile ? 0.024 : 0.028))
							: isCandleAutoDesign
								? Math.round((item.width || 180) * (isMobile ? 0.026 : 0.034))
							: Number(effectiveOccasionStylePreset.paddingX) ||
								Math.round((item.width || 180) * 0.055),
						isBagAutoDesign
							? 9
							: isToteAutoDesign
								? (isMobile ? 8 : 10)
								: isPillowAutoDesign
									? (isMobile ? 8 : 10)
								: isMagnetAutoDesign
									? (isMobile ? 6 : 8)
								: isCandleAutoDesign
									? (isMobile ? 6 : 10)
									: 8,
						isBagAutoDesign
							? 16
							: isToteAutoDesign
								? (isMobile ? 16 : 20)
							: isPillowAutoDesign
								? (isMobile ? 12 : 16)
								: isMagnetAutoDesign
									? (isMobile ? 12 : 14)
								: isCandleAutoDesign
									? (isMobile ? 12 : 18)
									: 20
					),
					paddingY: clampNumber(
						isBagAutoDesign
							? Math.round((item.height || 56) * 0.08)
							: isToteAutoDesign
								? Math.round((item.height || 56) * (isMobile ? 0.085 : 0.09))
							: isPillowAutoDesign
								? Math.round((item.height || 56) * (isMobile ? 0.044 : 0.05))
							: isMagnetAutoDesign
								? Math.round((item.height || 56) * (isMobile ? 0.038 : 0.044))
							: isCandleAutoDesign
								? Math.round((item.height || 56) * (isMobile ? 0.036 : 0.05))
							: Number(effectiveOccasionStylePreset.paddingY) ||
								Math.round((item.height || 56) * 0.09),
						isBagAutoDesign
							? 4
							: isToteAutoDesign
								? (isMobile ? 6 : 8)
								: isPillowAutoDesign
									? (isMobile ? 6 : 8)
								: isMagnetAutoDesign
									? (isMobile ? 4 : 6)
								: isCandleAutoDesign
									? (isMobile ? 5 : 8)
									: 4,
						isBagAutoDesign
							? 8
							: isToteAutoDesign
								? (isMobile ? 12 : 16)
							: isPillowAutoDesign
								? (isMobile ? 9 : 12)
								: isMagnetAutoDesign
									? (isMobile ? 10 : 12)
								: isCandleAutoDesign
									? (isMobile ? 10 : 14)
									: 10
					),
					lineHeight: isCandleAutoDesign
						? 0.96
						: isPillowAutoDesign
							? 1.01
						: isMagnetAutoDesign
							? 1.01
							: 1.08,
					ornamentLeft: effectiveOccasionStylePreset.ornamentLeft || "",
					ornamentRight: effectiveOccasionStylePreset.ornamentRight || "",
					ornamentColor:
						effectiveOccasionStylePreset.ornamentColor ||
						"rgba(16, 33, 24, 0.35)",
				};
			});
			const nextComparable = JSON.stringify(next);
			rememberAutoGeneratedSnapshot(position, next);
			return currentComparable === nextComparable ? prev : next;
		});
	}, [
		activePrintAreaPosition,
		catalogLayoutResolved,
		defaultTextAdded,
		effectiveOccasionStylePreset,
		product,
		selectedGiftName,
		selectedOccasion,
		selectedOccasionMeta.icon,
		printifySafeInsetPercent,
	]);

	useEffect(() => {
		if (
			activeProductKind !== "magnet" ||
			!catalogLayoutResolved ||
			!product ||
			!defaultTextAdded ||
			typeof ResizeObserver === "undefined"
		) {
			return undefined;
		}
		const node = printAreaRef.current;
		if (!node) return undefined;

		let frameId = null;

		const syncMagnetAutoLayout = () => {
			const currentElements = Array.isArray(elementsRef.current)
				? elementsRef.current
				: [];
			if (
				!currentElements.length ||
				!currentElements.every((item) => item.isAutoGenerated)
			) {
				return;
			}
			const position = normalizePrintAreaPosition(
				activePrintAreaPosition || "front"
			);
			const currentComparable = JSON.stringify(currentElements);
			const lastAutoSnapshot = autoGeneratedSnapshotRef.current[position];
			if (lastAutoSnapshot && currentComparable !== lastAutoSnapshot) {
				return;
			}

			const rect = node.getBoundingClientRect();
			if (!(rect.width > 0) || !(rect.height > 0)) {
				return;
			}

			const nextSignature = [
				position,
				Math.round(rect.width),
				Math.round(rect.height),
				isMobile ? "mobile" : "desktop",
				selectedOccasion || "",
				selectedGiftName || "",
			].join(":");
			if (autoGeneratedLayoutSignatureRef.current[position] === nextSignature) {
				return;
			}

			const ids = currentElements.reduce(
				(accumulator, item) => {
					if (item.autoKind === "message") accumulator.messageId = item.id;
					if (item.autoKind === "icon") accumulator.iconId = item.id;
					return accumulator;
				},
				{}
			);
			const drafts = buildAutoGeneratedDesignDrafts({
				messageId: ids.messageId || Date.now(),
				iconId: ids.iconId || Date.now() + 1,
				boundsWidth: rect.width,
				boundsHeight: rect.height,
			});
			if (!drafts) return;

			const next = [drafts.message, drafts.icon];
			const nextComparable = JSON.stringify(next);
			autoGeneratedLayoutSignatureRef.current[position] = nextSignature;
			if (currentComparable === nextComparable) {
				return;
			}
			rememberAutoGeneratedSnapshot(position, next);
			setElements((prev) => {
				const prevComparable = JSON.stringify(prev);
				return prevComparable === nextComparable ? prev : next;
			});
		};

		const queueSync = () => {
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			frameId = window.requestAnimationFrame(() => {
				syncMagnetAutoLayout();
			});
		};

		queueSync();
		const observer = new ResizeObserver(() => {
			queueSync();
		});
		observer.observe(node);

		return () => {
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			observer.disconnect();
		};
	}, [
		activePrintAreaPosition,
		activeProductKind,
		catalogLayoutResolved,
		defaultTextAdded,
		isMobile,
		product,
		selectedGiftName,
		selectedOccasion,
	]);

	/**
	 * 3) Whenever color/size/scent changes => update variant_id
	 */
	useEffect(() => {
		if (!product) return;
		const matchingVariant = findMatchingPodVariant(product, {
			color: selectedColor,
			size: selectedSize,
			scent: selectedScent,
		});
		const nextVariantId = matchingVariant?.id || null;
		setOrder((prev) =>
			prev.variant_id === nextVariantId
				? prev
				: { ...prev, variant_id: nextVariantId }
		);
	}, [product, selectedColor, selectedSize, selectedScent]);

	useEffect(() => {
		if (!product) return;
		const safe = savePodPersonalization({
			occasion: selectedOccasion,
			name: selectedGiftName,
		});
		const nextSearch = buildPersonalizationSearch(safe, {
			color: selectedColor || undefined,
			size: selectedSize || undefined,
			scent: selectedScent || undefined,
		});
		const normalizedNextSearch = normalizeSearchParamsString(nextSearch);
		const normalizedCurrentSearch = normalizeSearchParamsString(location.search);
		if (normalizedNextSearch === normalizedCurrentSearch) {
			lastRequestedPersonalizationSearchRef.current = "";
			return;
		}
		if (lastRequestedPersonalizationSearchRef.current === normalizedNextSearch) {
			return;
		}
		lastRequestedPersonalizationSearchRef.current = normalizedNextSearch;
		if (normalizedNextSearch !== normalizedCurrentSearch) {
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

		function numOrStr(val) {
			return typeof val === "number" ? val : parseInt(val, 10);
		}

		let chosenColorId = null;
		if (colorTitle) {
			const colorVal = findProductOptionValue(product, "color", colorTitle);
			if (!colorVal) return false;
			chosenColorId = numOrStr(colorVal.id);
		}

		let sizeValId = sizeObj ? numOrStr(sizeObj.id) : null;
		let chosenScentId = null;
		if (scentTitle) {
			const scVal = findProductOptionValue(product, "scent", scentTitle);
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

		function numOrStr(val) {
			return typeof val === "number" ? val : parseInt(val, 10);
		}

		let chosenColorId = null;
		if (colorTitle) {
			const colorVal = findProductOptionValue(product, "color", colorTitle);
			if (!colorVal) return false;
			chosenColorId = numOrStr(colorVal.id);
		}
		let chosenSizeId = null;
		if (sizeTitle) {
			const sizeVal = findProductOptionValue(product, "size", sizeTitle);
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
			messageApi.error(
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
									messageApi.info(
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
									messageApi.error(
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
			messageApi.error(
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
			messageApi.warning("Please enter some text first.");
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
				messageApi.success("Image Successfully Deleted.");
			} catch (error) {
				console.error("Failed to delete image:", error);
				messageApi.error("Failed to delete image from server.");
			}
		}
		setElements((prev) => prev.filter((item) => item.id !== elId));
		setSelectedElementId(null);
	}

	const [showCenterGuides, setShowCenterGuides] = useState({
		vertical: false,
		horizontal: false,
	});
	const [elementAlignmentGuides, setElementAlignmentGuides] = useState({
		vertical: null,
		horizontal: null,
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
	const elementGuideStateRef = useRef({ vertical: null, horizontal: null });
	const elementGuidePendingRef = useRef({ vertical: null, horizontal: null });
	const elementGuideRafRef = useRef(null);
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

	function queueElementAlignmentGuides(nextGuides) {
		const next = {
			vertical:
				Number.isFinite(Number(nextGuides?.vertical))
					? Number(nextGuides.vertical)
					: null,
			horizontal:
				Number.isFinite(Number(nextGuides?.horizontal))
					? Number(nextGuides.horizontal)
					: null,
		};
		elementGuidePendingRef.current = next;
		if (elementGuideRafRef.current) return;
		elementGuideRafRef.current = window.requestAnimationFrame(() => {
			elementGuideRafRef.current = null;
			const pending = elementGuidePendingRef.current;
			const current = elementGuideStateRef.current;
			if (
				current.vertical === pending.vertical &&
				current.horizontal === pending.horizontal
			) {
				return;
			}
			elementGuideStateRef.current = pending;
			setElementAlignmentGuides(pending);
		});
	}

	function hideCenterGuidesImmediate() {
		if (centerGuideRafRef.current) {
			window.cancelAnimationFrame(centerGuideRafRef.current);
			centerGuideRafRef.current = null;
		}
		if (elementGuideRafRef.current) {
			window.cancelAnimationFrame(elementGuideRafRef.current);
			elementGuideRafRef.current = null;
		}
		centerGuidePendingRef.current = { vertical: false, horizontal: false };
		elementGuidePendingRef.current = { vertical: null, horizontal: null };
		const current = centerGuideStateRef.current;
		const currentElementGuides = elementGuideStateRef.current;
		if (
			!current.vertical &&
			!current.horizontal &&
			currentElementGuides.vertical == null &&
			currentElementGuides.horizontal == null
		) {
			return;
		}
		centerGuideStateRef.current = { vertical: false, horizontal: false };
		elementGuideStateRef.current = { vertical: null, horizontal: null };
		setShowCenterGuides({ vertical: false, horizontal: false });
		setElementAlignmentGuides({ vertical: null, horizontal: null });
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

	function didElementGeometryChange(previousElements = [], nextElements = []) {
		if (previousElements.length !== nextElements.length) return true;
		for (let index = 0; index < previousElements.length; index += 1) {
			const previous = previousElements[index];
			const next = nextElements[index];
			if (
				previous?.id !== next?.id ||
				previous?.x !== next?.x ||
				previous?.y !== next?.y ||
				previous?.width !== next?.width ||
				previous?.height !== next?.height
			) {
				return true;
			}
		}
		return false;
	}

	async function normalizeDesignElementsForCapture() {
		const currentElements = Array.isArray(elementsRef.current)
			? elementsRef.current
			: [];
		const last = dragLastPositionRef.current;
		if (
			last?.elementId &&
			Number.isFinite(last.x) &&
			Number.isFinite(last.y)
		) {
			clearPendingDragPositionRafRef.current();
			commitElementDragPositionRef.current(last.elementId, last.x, last.y);
			dragLastPositionRef.current = { elementId: null, x: null, y: null };
		}
		dragSessionRef.current = false;
		dragGeometryRef.current.ready = false;
		hideCenterGuidesImmediateRef.current();
		if (rotationData.current.rotatingElementId) {
			onRotationEndRef.current();
		}

		await waitForNextPaint(1);
		const safeBounds = getActivePrintifySafeBoundsRef.current();
		if (!safeBounds) return currentElements;

		const normalizedElements = normalizeElementRectsWithinBounds(
			currentElements,
			safeBounds
		);
		if (!didElementGeometryChange(currentElements, normalizedElements)) {
			return currentElements;
		}

		elementsRef.current = normalizedElements;
		setElements(normalizedElements);
		await waitForNextPaint(2);
		return normalizedElements;
	}

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
		const safeBounds = resolvePrintifySafeBounds(
			printAreaBounds.width,
			printAreaBounds.height,
			printifySafeInsetPercent
		);
		const containerCenterX = safeBounds
			? safeBounds.minX + (safeBounds.maxX - safeBounds.minX) / 2
			: printAreaBounds.width / 2;
		const containerCenterY = safeBounds
			? safeBounds.minY + (safeBounds.maxY - safeBounds.minY) / 2
			: printAreaBounds.height / 2;
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
		if (notify) messageApi.success("Frame copied.");
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
			if (notify) messageApi.warning("Copy a frame first.");
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
		if (notify) messageApi.success("Frame pasted.");
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
			messageApi.warning("Select a frame to copy.");
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
			messageApi.warning("Select a frame first.");
			return;
		}
		copyFrameToClipboard(selected, { notify: false });
		pasteFrameFromClipboard({ notify: false });
		messageApi.success("Frame duplicated.");
	}

	function moveElementsToHorizontalAnchor(anchorRatio = 0.5) {
		const safeBounds = getActivePrintifySafeBoundsRef.current();
		if (!safeBounds) return;
		setElements((prev) => {
			const combinedBounds = getCombinedElementBounds(prev);
			if (!(combinedBounds?.width > 0) || !(combinedBounds?.height > 0)) {
				return prev;
			}
			const safeAnchorRatio = clampNumber(Number(anchorRatio) || 0.5, 0, 1);
			const safeWidth = Math.max(24, (Number(safeBounds.maxX) || 0) - (Number(safeBounds.minX) || 0));
			const targetX = clampNumber(
				(Number(safeBounds.minX) || 0) + safeWidth * safeAnchorRatio - combinedBounds.width / 2,
				Number(safeBounds.minX) || 0,
				(Math.max(Number(safeBounds.minX) || 0, Number(safeBounds.maxX) || 0) - combinedBounds.width)
			);
			const deltaX = targetX - combinedBounds.x;
			if (Math.abs(deltaX) < 0.5) {
				return prev;
			}
			const next = prev.map((item) => {
				const clamped = clampElementRectWithinBounds(
					{
						x: item.x + deltaX,
						y: item.y,
						width: item.width,
						height: item.height,
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
			});
			elementsRef.current = next;
			if (next.every((item) => item.isAutoGenerated)) {
				rememberAutoGeneratedSnapshot(activePrintAreaPosition, next);
			}
			return next;
		});
	}

	function handleMugQuickPlacement(anchor = "front") {
		const anchors = {
			left: 0.2,
			front: 0.5,
			right: 0.8,
		};
		setMugQuickPlacementPreset(anchor);
		moveElementsToHorizontalAnchor(anchors[anchor] || 0.5);
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
		const alignmentThreshold = 6;
		const movingAnchorsX = [
			clampedPoint.x,
			clampedPoint.x + theElement.width / 2,
			clampedPoint.x + theElement.width,
		];
		const movingAnchorsY = [
			clampedPoint.y,
			clampedPoint.y + theElement.height / 2,
			clampedPoint.y + theElement.height,
		];
		let bestVerticalGuide = null;
		let bestVerticalDiff = Infinity;
		let bestHorizontalGuide = null;
		let bestHorizontalDiff = Infinity;
		elements
			.filter((item) => item.id !== elId)
			.forEach((item) => {
				const candidateAnchorsX = [
					item.x,
					item.x + item.width / 2,
					item.x + item.width,
				];
				const candidateAnchorsY = [
					item.y,
					item.y + item.height / 2,
					item.y + item.height,
				];
				movingAnchorsX.forEach((movingAnchorX) => {
					candidateAnchorsX.forEach((candidateAnchorX) => {
						const diff = Math.abs(movingAnchorX - candidateAnchorX);
						if (diff <= alignmentThreshold && diff < bestVerticalDiff) {
							bestVerticalDiff = diff;
							bestVerticalGuide = candidateAnchorX;
						}
					});
				});
				movingAnchorsY.forEach((movingAnchorY) => {
					candidateAnchorsY.forEach((candidateAnchorY) => {
						const diff = Math.abs(movingAnchorY - candidateAnchorY);
						if (diff <= alignmentThreshold && diff < bestHorizontalDiff) {
							bestHorizontalDiff = diff;
							bestHorizontalGuide = candidateAnchorY;
						}
					});
				});
			});
		queueElementAlignmentGuides({
			vertical: bestVerticalGuide,
			horizontal: bestHorizontalGuide,
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
		const matchingVariant = findMatchingPodVariant(product, {
			variantId: order.variant_id,
			color: selectedColor,
			size: selectedSize,
			scent: selectedScent,
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
		const sourceImages = Array.isArray(product.images) ? product.images : [];
		const sortBySurface = (images) =>
			[...images]
				.sort(
					(left, right) =>
						scoreMockupImageForSurface(right, activePrintAreaPosition, product) -
						scoreMockupImageForSurface(left, activePrintAreaPosition, product)
				)
				.slice(0, 6);
		if (!selectedColor || !colorOpt) {
			return sortBySurface(sourceImages);
		}
		function numOrStr(x) {
			return typeof x === "number" ? x : parseInt(x, 10);
		}
		const colorVal = findProductOptionValue(product, "color", selectedColor);
		if (!colorVal) return sortBySurface(sourceImages);

		const matchingVars = product.variants.filter((v) => {
			const varIds = v.options.map(numOrStr);
			return varIds.includes(numOrStr(colorVal.id));
		});
		const matchingIds = matchingVars.map((mv) => mv.id);
		const filtered = sourceImages.filter((img) =>
			img.variant_ids.some((id) => matchingIds.includes(id))
		);
		return filtered.length ? sortBySurface(filtered) : sortBySurface(sourceImages);
	}, [activePrintAreaPosition, product, selectedColor]);

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

	async function generateCartMockupPreview(
		bareUrl,
		variantContext = buildSelectedVariantContext(product),
		captureAsset = null
	) {
		const fallbackResult = {
			mockupPreviewUrl: variantContext?.variantImage || "",
			previewImages: [],
			previewProductId: null,
			previewShopId: product?.printifyProductDetails?.shop_id || null,
		};

		if (!bareUrl || !variantContext?.matchingVariant?.id) {
			return fallbackResult;
		}

		try {
			if (activePreviewSession?.previewProductId && !isPreviewLinkedToCart) {
				await cleanupActivePreviewSession(activePreviewSession);
				setActivePreviewSession(null);
				setPreviewImages([]);
			}

			const response = await axios.post(
				`${process.env.REACT_APP_API_URL}/preview-custom-design`,
				{
					blueprint_id: product.printifyProductDetails?.blueprint_id,
					print_provider_id:
						product.printifyProductDetails?.print_provider_id,
					variant_id: variantContext.matchingVariant.id,
					design_image_url: bareUrl,
					bare_design_image_url: bareUrl,
					design_covers_print_area:
						captureAsset?.designCoversPrintArea !== false,
					design_is_full_print_area_capture:
						captureAsset?.isFullPrintAreaCapture !== false,
					force_source_placement: Boolean(captureAsset?.forceSourcePlacement),
					preferred_position: activePrintAreaPosition,
					title: product.title || product.productName,
					print_areas:
						captureAsset?.designCoversPrintArea === false
							? buildPodPlacementPrintAreas({
									variantId: variantContext.matchingVariant.id,
									position: activePrintAreaPosition,
									placementParams: captureAsset?.placementParams,
								})
							: product.printifyProductDetails?.print_areas || [],
				}
			);

			const images = Array.isArray(response?.data?.preview_images)
				? response.data.preview_images.filter(Boolean).slice(0, 3)
				: [];
			const previewProductId =
				response?.data?.preview_product_id || response?.data?.product_id || null;
			const previewShopId =
				response?.data?.shop_id ||
				product.printifyProductDetails?.shop_id ||
				null;

			setPreviewImages(images);
			if (previewProductId) {
				setActivePreviewSession({
					previewProductId,
					shopId: previewShopId,
				});
			} else {
				setActivePreviewSession(null);
			}
			setIsPreviewLinkedToCart(false);

			return {
				mockupPreviewUrl: images[0] || fallbackResult.mockupPreviewUrl,
				previewImages: images,
				previewProductId,
				previewShopId,
			};
		} catch (error) {
			console.error("Cart mockup preview generation failed:", error);
			return fallbackResult;
		}
	}

	/**
	 * 6) ADD TO CART => SCREENSHOT
	 */
	/**
	 * 6) ADD TO CART => SCREENSHOT
	 */
	async function handleAddToCart() {
		/* â”€â”€ StepÂ 0: remove default placeholder text, if still present â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		setElements((prev) => {
			const next = prev.filter(
				(el) =>
					!(el.type === "text" && el.text.trim() === "Start typing here...")
			);
			elementsRef.current = next;
			return next;
		});
		// wait a tick so the DOM reflects the removal before capture
		await new Promise((res) => setTimeout(res, 50));

		/* â”€â”€ early guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		if (isAddToCartDisabled) return false;
		const variantContext = buildSelectedVariantContext(product);
		const resolvedVariantId =
			variantContext?.matchingVariant?.id || order.variant_id || null;
		if (!resolvedVariantId) {
			messageApi.warning("Please select required options before adding to cart.");
			return false;
		}
		setIsAddToCartDisabled(true);
		const captureElements = await normalizeDesignElementsForCapture();

		/* â”€â”€ StepÂ 1: deselect everything (so outlines arenâ€™t captured) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		const previouslySelected = selectedElementId;
		setSelectedElementId(null);
		await new Promise((res) => setTimeout(res, 50));

		/* â”€â”€ StepÂ 2: try to capture screenshots (html2canvas â†’ domâ€‘toâ€‘image) â”€â”€â”€â”€ */
		let bareUrl, finalUrl;
		let bareCaptureAsset = null;
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
			const bareCaptureRect = bareCaptureNode.getBoundingClientRect();
			const contentBoundsNormalized = getNormalizedContentBounds(
				captureElements,
				bareCaptureRect.width,
				bareCaptureRect.height
			);
				bareCaptureAsset = buildPodBareCaptureAsset(
					await html2canvas(bareCaptureNode, screenshotOptions),
					{
						targetAspectRatio: activeCaptureAspectRatio,
						projection: activeCaptureProjection,
						contentBoundsNormalized,
						placementMode:
							activeProductKind === "mug" ||
							activeProductKind === "candle" ||
							activeProductKind === "tote" ||
							activeProductKind === "magnet"
								? "direct-wrap"
								: "projected",
					}
				);
			const bareCanvas = bareCaptureAsset?.uploadCanvas;
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
				const domtoimage = await getDomToImage();
				await prepareCaptureNode(bareCaptureNode);
				const bareCaptureRect = bareCaptureNode.getBoundingClientRect();
				const contentBoundsNormalized = getNormalizedContentBounds(
					captureElements,
					bareCaptureRect.width,
					bareCaptureRect.height
				);
				const bareBlob = await domtoimage.toBlob(
					bareCaptureNode,
					domOptions
				);
				bareCaptureAsset = buildPodBareCaptureAsset(
					await blobToCanvas(bareBlob),
					{
						targetAspectRatio: activeCaptureAspectRatio,
						projection: activeCaptureProjection,
						contentBoundsNormalized,
						placementMode:
							activeProductKind === "mug" ||
							activeProductKind === "candle" ||
							activeProductKind === "tote" ||
							activeProductKind === "magnet"
								? "direct-wrap"
								: "projected",
					}
				);
				const bareCanvas = bareCaptureAsset?.uploadCanvas;
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
				messageApi.error(
					"Screenshot attempts failed. Please refresh the page or try another device."
				);
				setSelectedElementId(previouslySelected);
				setIsAddToCartDisabled(false);
				return false;
			}
		}

		/* â”€â”€ guard: both URLs must exist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		if (!bareUrl || !finalUrl) {
			messageApi.error(
				"Screenshot attempts failed. Please refresh the page or try another device."
			);
			setSelectedElementId(previouslySelected);
			setIsAddToCartDisabled(false);
			return false;
		}

		/* â”€â”€ StepÂ 3: rebuild variantâ€‘price info, assemble customDesign payload â”€â”€ */
		const {
			colorValue,
			sizeValue,
			scentValue,
			matchingVariant,
			finalPrice,
			finalPriceAfterDiscount,
			variantImage,
			colorLabel,
			sizeLabel,
			scentLabel,
		} = variantContext;
		const previewResult = await generateCartMockupPreview(
			bareUrl,
			variantContext,
			bareCaptureAsset
		);

		const customDesign = {
			bareScreenshotUrl: bareUrl,
			finalScreenshotUrl: finalUrl,
			mockupPreviewUrl: previewResult.mockupPreviewUrl || "",
			mockupPreviewImages: previewResult.previewImages || [],
			originalPrintifyImageURL: variantImage,
			occasion: selectedOccasion,
			giftName: selectedGiftName,
			giftMessage: buildGiftMessage(selectedOccasion, selectedGiftName),
			size: sizeLabel,
			color: colorLabel,
			scent: scentLabel,
			printArea: activePrintAreaPosition,
			isFullPrintAreaCapture:
				bareCaptureAsset?.isFullPrintAreaCapture !== false,
			placementParams:
				bareCaptureAsset?.placementParams || {
					x: 0.5,
					y: 0.5,
					scale: 1,
					angle: 0,
				},
			PrintifyProductId: product.printifyProductDetails?.id || null,
			variantId: matchingVariant?.id || order.variant_id || null,
			variantSku: matchingVariant?.sku || "",
			variantTitle: matchingVariant?.title || "",
			previewProductId: previewResult.previewProductId || null,
			previewShopId: previewResult.previewShopId || null,
			customizations: JSON.parse(
				JSON.stringify(order.customizations || { texts: [], images: [] })
			),
			elements: captureElements.map((element) => ({
				id: element.id,
				type: element.type,
				text: element.text || "",
				src: element.src || "",
				x: element.x,
				y: element.y,
				width: element.width,
				height: element.height,
				rotation: element.rotation || 0,
				color: element.color || "",
				backgroundColor: element.backgroundColor || "",
				fontFamily: element.fontFamily || "",
				fontSize: element.fontSize || 0,
				fontWeight: element.fontWeight || "",
				fontStyle: element.fontStyle || "",
				borderRadius: element.borderRadius || 0,
				bgRemoved: !!element.bgRemoved,
				wasReset: !!element.wasReset,
			})),
			variants: {
				color: colorValue
					? {
							...colorValue,
							label: colorLabel,
					  }
					: null,
				size: sizeValue
					? {
							...sizeValue,
							label: sizeLabel,
					  }
					: null,
				scent: scentValue
					? {
							...scentValue,
							label: scentLabel,
					  }
					: null,
			},
		};

		const chosenProductAttributes = {
			SubSKU: String(Date.now()),
			color: colorLabel,
			size: sizeLabel,
			scent: scentLabel,
			variantId: matchingVariant?.id || order.variant_id || null,
			variantSku: matchingVariant?.sku || "",
			quantity: 999,
			productImages: previewResult.mockupPreviewUrl
				? [{ url: previewResult.mockupPreviewUrl }]
				: variantImage
					? [{ url: variantImage }]
					: [],
			price: finalPrice,
			priceAfterDiscount: finalPriceAfterDiscount,
		};

		/* â”€â”€ StepÂ 4: push to cart & emit analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		addToCart(
			product._id,
			colorLabel || selectedColor,
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
				void postFacebookConversion({
					eventName: "AddToCart",
					eventId,
					email: user?.email || null,
					phone: user?.phone || null,
					currency: "USD",
					value: finalPriceAfterDiscount,
					contentIds: [product._id],
					userAgent:
						typeof window !== "undefined" ? window.navigator.userAgent : "",
				});
			}
		} catch {}

		openSidebar2();
		messageApi.success("Added to cart with custom design!");
		if (previewResult.previewProductId) {
			setIsPreviewLinkedToCart(true);
		}

		/* â”€â”€ finally: restore selection & button state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
		setSelectedElementId(previouslySelected);
		setIsAddToCartDisabled(false);
		return true;
	}

	async function handlePreviewDesign() {
		if (isPreviewButtonDisabled || isPreviewLoading) return;
		const variantContext = buildSelectedVariantContext(product);
		const resolvedVariantId =
			variantContext?.matchingVariant?.id || order.variant_id || null;
		if (!resolvedVariantId) {
			messageApi.warning("Please select required options before previewing.");
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

			const captureElements = await normalizeDesignElementsForCapture();
			setSelectedElementId(null);
			await new Promise((res) => setTimeout(res, 50));

			let bareUrl;
			let bareCaptureAsset = null;
			try {
				const screenshotOptions = {
					scale: isMobile ? 2 : 3,
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
				const previewNodeRect = previewNode.getBoundingClientRect();
				const contentBoundsNormalized = getNormalizedContentBounds(
					captureElements,
					previewNodeRect.width,
					previewNodeRect.height
				);
				bareCaptureAsset = buildPodBareCaptureAsset(
					await html2canvas(previewNode, screenshotOptions),
					{
						targetAspectRatio: activeCaptureAspectRatio,
						projection: activeCaptureProjection,
						contentBoundsNormalized,
						placementMode:
							activeProductKind === "mug" ||
							activeProductKind === "candle" ||
							activeProductKind === "tote" ||
							activeProductKind === "magnet"
								? "direct-wrap"
								: "projected",
					}
				);
				const bareCanvas = bareCaptureAsset?.uploadCanvas;
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
					style: { transform: "scale(2)", transformOrigin: "top left" },
					filter: (node) => !node.classList?.contains("noScreenshot"),
				};
				const previewNode = getBareDesignCaptureNode();
				if (!previewNode) {
					throw new Error("Preview capture area is not ready yet.");
				}
				const domtoimage = await getDomToImage();
				await prepareCaptureNode(previewNode);
				const previewNodeRect = previewNode.getBoundingClientRect();
				const contentBoundsNormalized = getNormalizedContentBounds(
					captureElements,
					previewNodeRect.width,
					previewNodeRect.height
				);
				const bareBlob = await domtoimage.toBlob(previewNode, domOptions);
				bareCaptureAsset = buildPodBareCaptureAsset(
					await blobToCanvas(bareBlob),
					{
						targetAspectRatio: activeCaptureAspectRatio,
						projection: activeCaptureProjection,
						contentBoundsNormalized,
						placementMode:
							activeProductKind === "mug" ||
							activeProductKind === "candle" ||
							activeProductKind === "tote" ||
							activeProductKind === "magnet"
								? "direct-wrap"
								: "projected",
					}
				);
				const bareCanvas = bareCaptureAsset?.uploadCanvas;
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

			const variantContext = buildSelectedVariantContext(product);
			const previewPayload = {
				blueprint_id: product.printifyProductDetails?.blueprint_id,
				print_provider_id: product.printifyProductDetails?.print_provider_id,
				variant_id: resolvedVariantId,
				design_image_url: bareUrl,
				bare_design_image_url: bareUrl,
				design_covers_print_area:
					bareCaptureAsset?.designCoversPrintArea !== false,
				design_is_full_print_area_capture:
					bareCaptureAsset?.isFullPrintAreaCapture !== false,
				force_source_placement: Boolean(bareCaptureAsset?.forceSourcePlacement),
				preferred_position: activePrintAreaPosition,
				title: product.title || product.productName,
				print_areas:
					bareCaptureAsset?.designCoversPrintArea === false
						? buildPodPlacementPrintAreas({
								variantId: resolvedVariantId,
								position: activePrintAreaPosition,
								placementParams: bareCaptureAsset?.placementParams,
							})
						: product.printifyProductDetails?.print_areas || [],
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
			messageApi.error(
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
		return barePrintAreaRef.current || printAreaRef.current || bareDesignRef.current;
	}

	function syncBareDesignOverlaySize() {
		const liveOverlay = designOverlayRef.current;
		const bareOverlay = bareDesignRef.current;
		if (!liveOverlay || !bareOverlay) return;
		const rect = liveOverlay.getBoundingClientRect();
		const width = Math.round(rect.width || 0);
		const height = Math.round(rect.height || 0);
		if (!(width > 0) || !(height > 0)) return;
		bareOverlay.style.width = `${width}px`;
		bareOverlay.style.height = `${height}px`;
	}

	async function prepareCaptureNode(node) {
		if (!node) return;
		syncBareDesignOverlaySize();
		await waitForNextPaint(2);
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
				<SlickBaseStyles />
				<Skeleton active />
			</CustomizeWrapper>
		);
	}
	if (!product) {
		return (
			<CustomizeWrapper>
				<SlickBaseStyles />
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
			<SlickBaseStyles />
			{legacySeoEnabled ? <Helmet>
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
			</Helmet> : null}

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
															<Option
																key={cObj.id || cObj.title}
																value={getOptionDisplayLabel(cObj, cObj.title)}
															>
																{getOptionDisplayLabel(cObj, cObj.title)}
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
											{elementAlignmentGuides.vertical != null && (
												<ElementVerticalAlignmentIndicator
													style={{
														left: `${elementAlignmentGuides.vertical}px`,
													}}
												/>
											)}
											{elementAlignmentGuides.horizontal != null && (
												<ElementHorizontalAlignmentIndicator
													style={{
														top: `${elementAlignmentGuides.horizontal}px`,
													}}
												/>
											)}
											{elementAlignmentGuides.vertical != null &&
												elementAlignmentGuides.horizontal != null && (
													<ElementAlignmentGuideDot
														style={{
															left: `${elementAlignmentGuides.vertical}px`,
															top: `${elementAlignmentGuides.horizontal}px`,
														}}
													/>
												)}
											<DottedOverlay className='noScreenshot' />
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

					{(availablePrintAreaPositions.length > 1 || printAreaHelperText) && (
						<PrintSurfacePanel className='noScreenshot'>
							<PrintSurfaceLabel>
								{availablePrintAreaPositions.length > 1
									? "Print Area"
									: "Placement Guidance"}
							</PrintSurfaceLabel>
							{availablePrintAreaPositions.length > 1 && (
								<PrintSurfaceButtons>
									{availablePrintAreaPositions.map((position) => (
										<PrintSurfaceButton
											key={position}
											type='button'
											$active={activePrintAreaPosition === position}
											onClick={() => setActivePrintAreaPosition(position)}
										>
											{formatPrintAreaLabel(position)}
										</PrintSurfaceButton>
									))}
								</PrintSurfaceButtons>
							)}
							{printAreaHelperText && (
								<PrintSurfaceHint>{printAreaHelperText}</PrintSurfaceHint>
							)}
							{shouldShowMugQuickPlacements && (
								<>
									<PrintSurfaceLabel>Quick Placement</PrintSurfaceLabel>
									<PrintSurfaceButtons>
										<PrintSurfaceButton
											type='button'
											$active={mugQuickPlacementPreset === "left"}
											onClick={() => handleMugQuickPlacement("left")}
										>
											Left Side
										</PrintSurfaceButton>
										<PrintSurfaceButton
											type='button'
											$active={mugQuickPlacementPreset === "front"}
											onClick={() => handleMugQuickPlacement("front")}
										>
											Front
										</PrintSurfaceButton>
										<PrintSurfaceButton
											type='button'
											$active={mugQuickPlacementPreset === "right"}
											onClick={() => handleMugQuickPlacement("right")}
										>
											Right Side
										</PrintSurfaceButton>
									</PrintSurfaceButtons>
								</>
							)}
						</PrintSurfacePanel>
					)}

					{isMobile && (
						<MobileQuickPersonalizationPanel className='noScreenshot'>
							<MobileQuickPersonalizationGrid>
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
								<Input
									value={selectedGiftName}
									onChange={(e) =>
										syncPersonalization(selectedOccasion, e.target.value)
									}
									placeholder='Name (optional)'
									maxLength={40}
								/>
							</MobileQuickPersonalizationGrid>
						</MobileQuickPersonalizationPanel>
					)}

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
													<Option
														key={cObj.id || cObj.title}
														value={getOptionDisplayLabel(cObj, cObj.title)}
													>
														{getOptionDisplayLabel(cObj, cObj.title)}
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
											<Option
												key={cObj.id || cObj.title}
												value={getOptionDisplayLabel(cObj, cObj.title)}
											>
												{getOptionDisplayLabel(cObj, cObj.title)}
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

const MobileQuickPersonalizationPanel = styled.div`
	margin: 0 0 16px;
	padding: 10px;
	background: #fff;
	border: 1px solid #ece0d6;
	border-radius: 12px;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
`;

const MobileQuickPersonalizationGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	gap: 8px;

	@media (max-width: 360px) {
		grid-template-columns: 1fr;
	}
`;

const PrintSurfacePanel = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0 0 16px;
	padding: 14px 16px;
	background: linear-gradient(180deg, #fffaf6 0%, #ffffff 100%);
	border: 1px solid #ece0d6;
	border-radius: 14px;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
`;

const PrintSurfaceLabel = styled.div`
	font-size: 0.95rem;
	font-weight: 700;
	letter-spacing: 0.01em;
	color: var(--text-color-dark);
`;

const PrintSurfaceHint = styled.p`
	margin: 0;
	font-size: 0.88rem;
	line-height: 1.5;
	color: rgba(66, 52, 39, 0.82);
`;

const PrintSurfaceButtons = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
`;

const PrintSurfaceButton = styled.button`
	border: 1px solid ${({ $active }) => ($active ? "#9c8466" : "#e6d7ca")};
	background: ${({ $active }) =>
		$active
			? "linear-gradient(135deg, #b79d7b 0%, #9c8466 100%)"
			: "linear-gradient(180deg, #ffffff 0%, #fff8f1 100%)"};
	color: ${({ $active }) => ($active ? "#ffffff" : "var(--text-color-dark)")};
	font-size: 0.92rem;
	font-weight: 700;
	line-height: 1;
	padding: 10px 14px;
	border-radius: 999px;
	cursor: pointer;
	transition:
		transform 0.18s ease,
		box-shadow 0.18s ease,
		border-color 0.18s ease,
		background 0.18s ease;
	box-shadow: ${({ $active }) =>
		$active
			? "0 10px 20px rgba(156, 132, 102, 0.24)"
			: "0 4px 12px rgba(0, 0, 0, 0.05)"};

	&:hover {
		transform: translateY(-1px);
		border-color: #b79d7b;
	}

	&:focus-visible {
		outline: 2px solid rgba(183, 157, 123, 0.35);
		outline-offset: 2px;
	}
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
	width: 800px;
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

const ElementVerticalAlignmentIndicator = styled.div`
	position: absolute;
	top: 0;
	bottom: 0;
	width: 0;
	transform: translateX(-50%);
	pointer-events: none;
	z-index: 9998;
	border-left: 1px dashed rgba(53, 117, 222, 0.68);
`;

const ElementHorizontalAlignmentIndicator = styled.div`
	position: absolute;
	left: 0;
	right: 0;
	height: 0;
	transform: translateY(-50%);
	pointer-events: none;
	z-index: 9998;
	border-top: 1px dashed rgba(53, 117, 222, 0.68);
`;

const ElementAlignmentGuideDot = styled.div`
	position: absolute;
	width: 7px;
	height: 7px;
	transform: translate(-50%, -50%);
	border-radius: 50%;
	background: rgba(53, 117, 222, 0.82);
	box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
	pointer-events: none;
	z-index: 9999;
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


