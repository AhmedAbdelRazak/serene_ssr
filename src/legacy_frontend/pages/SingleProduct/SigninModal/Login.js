/** @format */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { authenticate, isAuthenticated, signin } from "../../../auth";
import { getOnlineStoreData } from "../../../Global"; // Import the function to get the store logo
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { Form, Input, Button, Typography, Row, Col, Card } from "antd";
import { MailOutlined, PhoneOutlined, LockOutlined } from "@ant-design/icons";

const { Title } = Typography;

const Login = ({ setSignRegister }) => {
	const [values, setValues] = useState({
		emailOrPhone: "",
		password: "",
		loading: false,
		redirectToReferrer: false,
	});

	const [storeLogo, setStoreLogo] = useState("");

	useEffect(() => {
		const fetchData = async () => {
			const url = await getOnlineStoreData();
			setStoreLogo(url);
		};

		fetchData();
	}, []);

	const { emailOrPhone, password, loading } = values;
	// eslint-disable-next-line
	const { user } = isAuthenticated();

	const handleChange = (name) => (event) => {
		setValues({ ...values, error: false, [name]: event.target.value });
	};

	const formatPhoneNumber = (value) => {
		if (!value) return value;
		const phoneNumber = value.replace(/[^\d]/g, "");
		const phoneNumberLength = phoneNumber.length;

		if (phoneNumberLength < 4) return phoneNumber;
		if (phoneNumberLength < 7) {
			return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
		}
		return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
			3,
			6
		)}-${phoneNumber.slice(6, 10)}`;
	};

	const handlePhoneChange = (event) => {
		const formattedPhoneNumber = formatPhoneNumber(event.target.value);
		setValues({
			...values,
			emailOrPhone: formattedPhoneNumber,
		});
	};

	const clickSubmit = (values) => {
		setValues({ ...values, error: false, loading: true });
		signin({
			emailOrPhone: values.emailOrPhone,
			password: values.password,
		}).then((data) => {
			if (data.error) {
				setValues({ ...values, error: data.error, loading: false });
				toast.error(data.error);
			} else if (data.user.activeUser === false) {
				setValues({ ...values, error: data.error, loading: false });
				return toast.error(
					"User was deactivated, Please reach out to the admin site"
				);
			} else {
				authenticate(data, () => {
					setValues({
						...values,
					});
					setTimeout(function () {
						window.location.reload(false);
					}, 2000);
				});
			}
		});
	};

	const showLoading = () =>
		loading && (
			<div className='alert alert-info'>
				<h2>Loading...</h2>
			</div>
		);

	const signinForm = () => (
		<Row justify='center' style={{ marginTop: "50px" }}>
			<Col xs={24} sm={20} md={17} lg={14} xl={15}>
				<Card>
					<div className='text-center mb-4'>
						<img
							src={storeLogo}
							alt='Store Logo'
							style={{ maxWidth: "150px" }}
						/>
					</div>
					<Title level={2} className='text-center'>
						Account <span className='text-primary'>Login</span>
					</Title>
					<Form onFinish={clickSubmit} layout='vertical'>
						<Form.Item
							name='emailOrPhone'
							label='Email or Phone'
							rules={[
								{
									required: true,
									message: "Please input your email or phone!",
								},
							]}
						>
							<Input
								prefix={
									emailOrPhone.includes("@") ? (
										<MailOutlined />
									) : (
										<PhoneOutlined />
									)
								}
								value={emailOrPhone}
								onChange={
									emailOrPhone.includes("@")
										? handleChange("emailOrPhone")
										: handlePhoneChange
								}
								placeholder='Email / Phone'
							/>
						</Form.Item>
						<Form.Item
							name='password'
							label='Password'
							rules={[
								{ required: true, message: "Please input your password!" },
							]}
						>
							<Input.Password
								prefix={<LockOutlined />}
								value={password}
								onChange={handleChange("password")}
								placeholder='Password'
							/>
						</Form.Item>
						<Form.Item>
							<Button type='primary' htmlType='submit' block loading={loading}>
								Login
							</Button>
						</Form.Item>
					</Form>
					<hr />

					<p
						style={{ textAlign: "center" }}
						onClick={() => {
							setSignRegister("Register");
						}}
					>
						Don't Have an Account? Please{" "}
						<Link to='#' className='btn btn-sm btn-outline-danger'>
							Register
						</Link>
					</p>
				</Card>
			</Col>
		</Row>
	);

	return (
		<WholeSignin>
			<ToastContainer className='toast-top-center' position='top-center' />
			{showLoading()}
			<div className='row'>
				<div className='col-md-8 mx-auto'>{signinForm()}</div>
			</div>
		</WholeSignin>
	);
};

export default Login;

const WholeSignin = styled.div`
	overflow-x: hidden;
	min-height: 700px;
	margin: 0px !important;

	.storeName {
		color: darkred;
		letter-spacing: 5px;
		font-size: 1.8rem;
		font-weight: bold;
	}

	@media (max-width: 1000px) {
		.infiniteAppsLogo {
			width: 48px;
			height: 48px;
		}
	}
`;
