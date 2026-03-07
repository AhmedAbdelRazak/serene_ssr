// sections/TermsB2BSection.js
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

const TermsB2BSection = ({ websiteData, setWebsiteData }) => {
	const handleChange = (value) => {
		setWebsiteData((prev) => ({ ...prev, termsAndCondition_B2B: value }));
	};

	return (
		<div>
			<h3>Terms & Conditions (B2B / Sellers)</h3>
			<ReactQuill
				value={websiteData.termsAndCondition_B2B || ""}
				onChange={handleChange}
				modules={{ toolbar: { container: toolbarOptions } }}
				style={{ height: "450px" }}
			/>
		</div>
	);
};

export default TermsB2BSection;

