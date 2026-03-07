// sections/TermsGuestsSection.js
import React from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const toolbarOptions = [
	[{ header: [1, 2, 3, false] }],
	["bold", "italic", "underline", "strike", { color: [] }],
	[{ list: "ordered" }, { list: "bullet" }],
	["link", "image", "video"],
	["clean"],
];

const TermsGuestsSection = ({ websiteData, setWebsiteData }) => {
	const handleChange = (value) => {
		setWebsiteData((prev) => ({ ...prev, termsAndCondition: value }));
	};

	return (
		<div>
			<h3>Terms & Conditions (Guests)</h3>
			<ReactQuill
				value={websiteData.termsAndCondition || ""}
				onChange={handleChange}
				modules={{ toolbar: { container: toolbarOptions } }}
				style={{ height: "450px" }}
			/>
		</div>
	);
};

export default TermsGuestsSection;

