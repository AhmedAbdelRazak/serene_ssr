/** @format */

import React from "react";
import { Route, Redirect } from "react-router-dom";
import { isAuthenticated } from "./index";

const AdminRoute = ({ component: Component, ...rest }) => (
	<Route
		{...rest}
		render={(props) =>
			isAuthenticated() &&
			isAuthenticated().user.role === 1 &&
			isAuthenticated().user._id === "663539b4eb1a090ebd349d65" ? (
				<Component {...props} />
			) : (
				<Redirect
					to={{
						pathname: "/",
						state: { from: props.location },
					}}
				/>
			)
		}
	/>
);

export default AdminRoute;
