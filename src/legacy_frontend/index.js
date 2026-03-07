import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CartProvider } from "./cart_context";
import { GoogleOAuthProvider } from "@react-oauth/google";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.Fragment>
		<CartProvider>
			<GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
				<App />
			</GoogleOAuthProvider>
		</CartProvider>
	</React.Fragment>
);
