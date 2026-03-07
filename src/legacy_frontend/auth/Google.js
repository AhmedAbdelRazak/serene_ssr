/** @format */

import React from "react";
// import GoogleLogin from "react-google-login";
import axios from "axios";

const Google = ({ informParent = (f) => f }) => {
	// eslint-disable-next-line
	const responseGoogle = (response) => {
		console.log(response.tokenId);
		axios({
			method: "POST",
			url: `${process.env.REACT_APP_API_URL}/google-login`,
			data: { idToken: response.tokenId },
		})
			.then((response) => {
				console.log("GOOGLE SIGNIN SUCCESS", response);
				// inform parent component
				informParent(response);
			})
			.catch((error) => {
				console.log("GOOGLE SIGNIN ERROR", error.response);
			});
	};
	return <div className='pb-3'>Google Login</div>;
};

export default Google;
