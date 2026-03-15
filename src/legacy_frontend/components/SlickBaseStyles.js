import { createGlobalStyle } from "styled-components";

const SlickBaseStyles = createGlobalStyle`
	.slick-slider {
		position: relative;
		display: block;
		box-sizing: border-box;
		user-select: none;
		touch-action: pan-y;
		-webkit-tap-highlight-color: transparent;
	}

	.slick-list {
		position: relative;
		display: block;
		overflow: hidden;
		margin: 0;
		padding: 0;
	}

	.slick-list:focus {
		outline: none;
	}

	.slick-list.dragging {
		cursor: grabbing;
	}

	.slick-slider .slick-track,
	.slick-slider .slick-list {
		transform: translate3d(0, 0, 0);
	}

	.slick-track {
		position: relative;
		top: 0;
		left: 0;
		display: block;
		margin-left: auto;
		margin-right: auto;
	}

	.slick-track:before,
	.slick-track:after {
		display: table;
		content: "";
	}

	.slick-track:after {
		clear: both;
	}

	.slick-loading .slick-track {
		visibility: hidden;
	}

	.slick-slide {
		display: none;
		float: left;
		height: 100%;
		min-height: 1px;
	}

	[dir="rtl"] .slick-slide {
		float: right;
	}

	.slick-slide img {
		display: block;
	}

	.slick-slide.slick-loading img {
		display: none;
	}

	.slick-slide.dragging img {
		pointer-events: none;
	}

	.slick-initialized .slick-slide {
		display: block;
	}

	.slick-loading .slick-slide {
		visibility: hidden;
	}

	.slick-vertical .slick-slide {
		display: block;
		height: auto;
		border: 1px solid transparent;
	}

	.slick-arrow.slick-hidden {
		display: none;
	}

	.slick-prev,
	.slick-next {
		position: absolute;
		top: 50%;
		display: block;
		width: 20px;
		height: 20px;
		padding: 0;
		transform: translateY(-50%);
		cursor: pointer;
		color: transparent;
		border: none;
		outline: none;
		background: transparent;
	}

	.slick-prev:hover,
	.slick-prev:focus,
	.slick-next:hover,
	.slick-next:focus {
		outline: none;
		background: transparent;
	}

	.slick-prev {
		left: -25px;
	}

	[dir="rtl"] .slick-prev {
		right: -25px;
		left: auto;
	}

	.slick-next {
		right: -25px;
	}

	[dir="rtl"] .slick-next {
		right: auto;
		left: -25px;
	}

	.slick-prev:before,
	.slick-next:before,
	.slick-dots li button:before {
		font-family: inherit !important;
	}

	.slick-prev:before,
	.slick-next:before {
		font-size: 20px;
		line-height: 1;
		opacity: 0.75;
		color: #ffffff;
	}

	.slick-prev:before {
		content: "<" !important;
	}

	.slick-next:before {
		content: ">" !important;
	}

	.slick-dotted.slick-slider {
		margin-bottom: 30px;
	}

	.slick-dots {
		position: absolute;
		bottom: -25px;
		display: block;
		width: 100%;
		padding: 0;
		margin: 0;
		list-style: none;
		text-align: center;
	}

	.slick-dots li {
		position: relative;
		display: inline-block;
		width: 20px;
		height: 20px;
		margin: 0 5px;
		padding: 0;
		cursor: pointer;
	}

	.slick-dots li button {
		font-size: 0;
		line-height: 0;
		display: block;
		width: 20px;
		height: 20px;
		padding: 5px;
		cursor: pointer;
		color: transparent;
		border: 0;
		outline: none;
		background: transparent;
	}

	.slick-dots li button:before {
		content: "\\2022" !important;
		position: absolute;
		top: 0;
		left: 0;
		width: 20px;
		height: 20px;
		font-size: 10px;
		line-height: 20px;
		text-align: center;
		opacity: 0.25;
		color: #000000;
	}

	.slick-dots li.slick-active button:before {
		opacity: 0.75;
		color: #000000;
	}
`;

export default SlickBaseStyles;
