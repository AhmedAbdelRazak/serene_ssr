// sections/ContactUsSection.js
import React from "react";

const ContactUsSection = ({ websiteData, setWebsiteData }) => {
	const contactUs = websiteData.contactUsPage || {};

	const handleChange = (field, value) => {
		setWebsiteData((prev) => ({
			...prev,
			contactUsPage: {
				...(prev?.contactUsPage || {}),
				[field]: value,
			},
		}));
	};

	return (
		<div>
			<h3>Contact Us Page</h3>

			<label>Phone:</label>
			<input
				type='text'
				className='form-control'
				value={contactUs.phone || ""}
				onChange={(e) => handleChange("phone", e.target.value)}
			/>

			<label>Email:</label>
			<input
				type='text'
				className='form-control'
				value={contactUs.email || ""}
				onChange={(e) => handleChange("email", e.target.value)}
			/>

			<label>Paragraph:</label>
			<textarea
				rows='4'
				className='form-control'
				value={contactUs.paragraph || ""}
				onChange={(e) => handleChange("paragraph", e.target.value)}
			/>
		</div>
	);
};

export default ContactUsSection;
