/** @format */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Select } from "antd";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import {
	createAICampaign,
	getAiCampaignProductsAndCategories,
} from "../apiAdmin";

const { Option } = Select;

const CreateCampaign = () => {
	const { user, token } = isAuthenticated();

	const [allProducts, setAllProducts] = useState([]);
	const [categories, setCategories] = useState([]);

	const [selectedCategoryId, setSelectedCategoryId] = useState("");
	const [selectedProductIds, setSelectedProductIds] = useState([]);
	const [useAllInCategory, setUseAllInCategory] = useState(false);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const [budgetMin, setBudgetMin] = useState(5);
	const [budgetMax, setBudgetMax] = useState(10);
	const [currency, setCurrency] = useState("USD");

	const [startDate, setStartDate] = useState(
		new Date().toISOString().slice(0, 10)
	);
	const [endDate, setEndDate] = useState(
		new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
	);

	const [timezone, setTimezone] = useState("America/New_York");
	const [auditFrequencyMinutes, setAuditFrequencyMinutes] = useState(180);
	const [automationEnabled, setAutomationEnabled] = useState(true);

	const [loadingMeta, setLoadingMeta] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		loadMeta();
		// eslint-disable-next-line
	}, []);

	const loadMeta = () => {
		setLoadingMeta(true);

		// If you have storeId in context, pass it in query
		// e.g. getAiCampaignProductsAndCategories(user._id, token, { storeId })
		getAiCampaignProductsAndCategories(user._id, token)
			.then((data) => {
				if (!data) {
					toast.error("No response from server.");
				} else if (data.error) {
					console.log(data.error);
					toast.error(data.error);
				} else {
					setAllProducts(data.products || []);
					setCategories(data.distinctCategories || []);
				}
				setLoadingMeta(false);
			})
			.catch((err) => {
				console.log(err);
				setLoadingMeta(false);
				toast.error(
					"Error loading active products & categories for AI campaign."
				);
			});
	};

	const handleCategoryChange = (e) => {
		const value = e.target.value;
		setSelectedCategoryId(value);
		setUseAllInCategory(false);
		setSelectedProductIds([]);
	};

	const categoryProducts = allProducts.filter(
		(p) => p.category && String(p.category._id) === String(selectedCategoryId)
	);

	const handleUseAllToggle = (e) => {
		const checked = e.target.checked;
		setUseAllInCategory(checked);
		if (checked) {
			const ids = categoryProducts.map((p) => p._id);
			setSelectedProductIds(ids);
		} else {
			setSelectedProductIds([]);
		}
	};

	const handleSelectedProductsChange = (ids) => {
		setSelectedProductIds(ids);
	};

	const handleSubmit = (e) => {
		e.preventDefault();

		if (!selectedCategoryId) {
			return toast.error("Please select a category first.");
		}

		const productsForCategory = categoryProducts;

		let productIds = [];
		if (useAllInCategory) {
			productIds = productsForCategory.map((p) => p._id);
		} else {
			productIds = selectedProductIds;
		}

		if (!productIds.length) {
			return toast.error(
				"Please choose at least one product or select all products in this category."
			);
		}

		if (!budgetMin || !budgetMax || budgetMax < budgetMin) {
			return toast.error(
				"Please provide a valid budget interval (min <= max)."
			);
		}

		const start = startDate ? new Date(startDate) : new Date();
		const end = endDate ? new Date(endDate) : null;

		const payload = {
			name,
			description,
			productIds,
			budgetInterval: {
				min: Number(budgetMin),
				max: Number(budgetMax),
				currency: currency || "USD",
				type: "daily",
			},
			schedule: {
				startDate: start.toISOString(),
				endDate: end ? end.toISOString() : undefined,
				timezone,
				auditFrequencyMinutes: Number(auditFrequencyMinutes) || 180,
				automationEnabled,
			},
			// channels / creativeStrategy / optimizationRules are optional;
			// backend uses your smart defaults (US / Google Ads / data-driven goals).
		};

		setSubmitting(true);

		createAICampaign(user._id, token, payload)
			.then((data) => {
				if (!data) {
					toast.error("No response from server.");
				} else if (data.error) {
					console.log(data.error);
					toast.error(data.error);
				} else {
					toast.success(
						"AI campaign created. The AI agent will now generate creatives and start optimizing."
					);
					// Optionally reset:
					// setName(""); setDescription(""); setSelectedCategoryId(""); ...
				}
			})
			.catch((err) => {
				console.log(err);
				toast.error("Error creating AI campaign.");
			})
			.finally(() => setSubmitting(false));
	};

	return (
		<CreateCampaignWrapper>
			<h3 className='mb-4' style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
				Create New AI Marketing Campaign
			</h3>

			<div className='row'>
				{/* LEFT: category + products (active only) */}
				<div className='col-md-5'>
					<div className='formwrapper'>
						<h5
							style={{ fontWeight: "bold", fontSize: "1rem" }}
							className='mb-3'
						>
							Step 1 – Choose Category (Active Products Only)
						</h5>

						<div className='form-group'>
							<label
								className='text-muted'
								style={{ fontWeight: "bold", fontSize: "13px" }}
							>
								Category
							</label>
							<select
								className='form-control'
								value={selectedCategoryId}
								onChange={handleCategoryChange}
								disabled={loadingMeta}
							>
								<option value=''>Please select</option>
								{categories.map((c) => (
									<option key={c._id} value={c._id}>
										{c.categoryName}
									</option>
								))}
							</select>
						</div>

						{selectedCategoryId && (
							<>
								<div className='form-group mt-2'>
									<label
										className='text-muted'
										style={{
											fontWeight: "bold",
											fontSize: "13px",
										}}
									>
										Use All Active Products In This Category
									</label>
									<input
										type='checkbox'
										className='ml-2 mt-2'
										onChange={handleUseAllToggle}
										checked={useAllInCategory}
									/>
								</div>

								{!useAllInCategory && (
									<div className='form-group mt-3'>
										<label
											className='text-muted'
											style={{
												fontWeight: "bold",
												fontSize: "13px",
											}}
										>
											Or Select Specific Products
										</label>
										<Select
											mode='multiple'
											style={{ width: "100%" }}
											placeholder='Search & select products'
											value={selectedProductIds}
											onChange={handleSelectedProductsChange}
											optionFilterProp='children'
											showSearch
										>
											{categoryProducts.map((p) => (
												<Option key={p._id} value={p._id}>
													{p.productName} {p.isPrintifyProduct ? "(POD)" : ""}
												</Option>
											))}
										</Select>
										<small className='text-muted'>
											Only active products are shown here.
										</small>
									</div>
								)}
							</>
						)}

						{!selectedCategoryId && !loadingMeta && (
							<p className='text-muted mt-3' style={{ fontSize: "0.85rem" }}>
								Select a category first to see its active products.
							</p>
						)}
					</div>
				</div>

				{/* RIGHT: campaign meta, budget & schedule */}
				<div className='col-md-7'>
					<form onSubmit={handleSubmit}>
						<div className='form-group'>
							<label style={{ fontWeight: "bold", fontSize: "13px" }}>
								Campaign Name
							</label>
							<input
								type='text'
								className='form-control'
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder='e.g. Summer Dresses – Google Ads'
							/>
						</div>

						<div className='form-group'>
							<label style={{ fontWeight: "bold", fontSize: "13px" }}>
								Campaign Description (optional)
							</label>
							<textarea
								className='form-control'
								rows={3}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder='Any extra context for the AI agent (target persona, constraints, etc.)'
							/>
						</div>

						<hr />

						<h5
							style={{ fontWeight: "bold", fontSize: "1rem" }}
							className='mt-3'
						>
							Budget & Schedule
						</h5>

						<div className='form-row'>
							<div className='form-group col-md-4'>
								<label
									className='text-muted'
									style={{
										fontWeight: "bold",
										fontSize: "13px",
									}}
								>
									Daily Budget Min (USD)
								</label>
								<input
									type='number'
									min='1'
									step='0.5'
									className='form-control'
									value={budgetMin}
									onChange={(e) => setBudgetMin(e.target.value)}
								/>
							</div>
							<div className='form-group col-md-4'>
								<label
									className='text-muted'
									style={{
										fontWeight: "bold",
										fontSize: "13px",
									}}
								>
									Daily Budget Max (USD)
								</label>
								<input
									type='number'
									min='1'
									step='0.5'
									className='form-control'
									value={budgetMax}
									onChange={(e) => setBudgetMax(e.target.value)}
								/>
							</div>
							<div className='form-group col-md-4'>
								<label
									className='text-muted'
									style={{
										fontWeight: "bold",
										fontSize: "13px",
									}}
								>
									Currency
								</label>
								<select
									className='form-control'
									value={currency}
									onChange={(e) => setCurrency(e.target.value)}
								>
									<option value='USD'>USD</option>
									<option value='EUR'>EUR</option>
									<option value='EGP'>EGP</option>
								</select>
							</div>
						</div>

						<div className='form-row'>
							<div className='form-group col-md-6'>
								<label
									className='text-muted'
									style={{
										fontWeight: "bold",
										fontSize: "13px",
									}}
								>
									Start Date
								</label>
								<input
									type='date'
									className='form-control'
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
								/>
							</div>
							<div className='form-group col-md-6'>
								<label
									className='text-muted'
									style={{
										fontWeight: "bold",
										fontSize: "13px",
									}}
								>
									End Date (optional)
								</label>
								<input
									type='date'
									className='form-control'
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
							</div>
						</div>

						<div className='form-row'>
							<div className='form-group col-md-6'>
								<label
									className='text-muted'
									style={{
										fontWeight: "bold",
										fontSize: "13px",
									}}
								>
									Timezone
								</label>
								<input
									type='text'
									className='form-control'
									value={timezone}
									onChange={(e) => setTimezone(e.target.value)}
									placeholder='e.g. America/New_York'
								/>
							</div>
							<div className='form-group col-md-6'>
								<label
									className='text-muted'
									style={{
										fontWeight: "bold",
										fontSize: "13px",
									}}
								>
									Audit Frequency (minutes)
								</label>
								<input
									type='number'
									min='30'
									step='30'
									className='form-control'
									value={auditFrequencyMinutes}
									onChange={(e) => setAuditFrequencyMinutes(e.target.value)}
								/>
								<small className='text-muted'>
									Default is 180 (every 3 hours)
								</small>
							</div>
						</div>

						<div className='form-group mt-2'>
							<label
								className='text-muted'
								style={{
									fontWeight: "bold",
									fontSize: "13px",
								}}
							>
								Automation Enabled
							</label>
							<input
								type='checkbox'
								className='ml-2 mt-2'
								onChange={() => setAutomationEnabled(!automationEnabled)}
								checked={automationEnabled}
							/>
						</div>

						<div className='mt-4'>
							<button
								className='btn btn-success'
								type='submit'
								disabled={submitting}
							>
								{submitting ? "Creating..." : "Create AI Campaign"}
							</button>
						</div>

						<p className='text-muted mt-3' style={{ fontSize: "0.85rem" }}>
							By default, the AI agent will:
							<ul>
								<li>Target the US market by default.</li>
								<li>Create / optimize a Google Ads campaign first.</li>
								<li>Generate text, video, and music assets where possible.</li>
								<li>
									Regularly audit performance, learn from conversions, and keep
									a full audit log in the campaign schema.
								</li>
							</ul>
						</p>
					</form>
				</div>
			</div>
		</CreateCampaignWrapper>
	);
};

export default CreateCampaign;

const CreateCampaignWrapper = styled.div`
	min-height: 600px;

	.formwrapper {
		background: white;
		padding: 15px 20px;
		border-radius: 5px;
		border: 1px solid #eee;
	}
`;
